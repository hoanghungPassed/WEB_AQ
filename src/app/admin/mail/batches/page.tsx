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

    const loadBatches = () => {
      const savedBatches = localStorage.getItem("global_batches");
      const savedMails = localStorage.getItem("global_mails_data");
      const mails = savedMails ? JSON.parse(savedMails) : [];

      if (!savedBatches || JSON.parse(savedBatches).length === 0) {
        // Dynamic Fallback Seeding
        const batchesMap: Record<string, BatchItem> = {};
        mails.forEach((m: any) => {
          if (m.batchName) {
            const key = `${m.type}-${m.batchName}`;
            if (!batchesMap[key]) {
              batchesMap[key] = {
                id: m.batchId || `batch-seed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: m.batchName,
                type: m.type as any,
                importedAt: m.createdAt || new Date().toISOString().split("T")[0],
                mailCount: 0,
                importedBy: m.updatedBy || "Admin"
              };
            }
            batchesMap[key].mailCount++;
          }
        });
        const seeded = Object.values(batchesMap);
        localStorage.setItem("global_batches", JSON.stringify(seeded));
        setBatches(seeded);
      } else {
        const parsedBatches = JSON.parse(savedBatches);
        // Sync counting to ensure accurate display
        const updated = parsedBatches.map((b: BatchItem) => {
          const count = mails.filter((m: any) => m.batchId === b.id || m.batchName === b.name).length;
          return { ...b, mailCount: count };
        });
        setBatches(updated);
      }
    };

    loadBatches();
    window.addEventListener("storage", loadBatches);
    return () => window.removeEventListener("storage", loadBatches);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;

    // Filter out deleted batch from local state and storage
    const updatedBatches = batches.filter(b => b.id !== batchToDelete.id);
    setBatches(updatedBatches);
    localStorage.setItem("global_batches", JSON.stringify(updatedBatches));

    // Cascade delete mails matching this batchId or batchName
    const savedMails = localStorage.getItem("global_mails_data");
    const allMails = savedMails ? JSON.parse(savedMails) : [];
    const remainingMails = allMails.filter((m: any) => 
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

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.importedBy.toLowerCase().includes(searchTerm.toLowerCase());
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
    const total = batches.length;
    const rootCount = batches.filter(b => b.type === "ROOT").length;
    const satelliteCount = batches.filter(b => b.type === "SATELLITE").length;
    const monetizedCount = batches.filter(b => b.type === "MONETIZED").length;
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
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border border-red-500/30 rounded-[32px] p-8 w-full max-w-md shadow-2xl flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Xóa Lô Mail</h3>
                  <p className="text-[10px] text-red-500/70 font-black uppercase tracking-widest mt-0.5">Cảnh báo Cascade Delete</p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6 text-xs text-gray-300 font-bold leading-relaxed">
                Bạn có chắc chắn muốn xóa Lô <span className="text-red-400 font-black">"{batchToDelete.name}"</span> và toàn bộ <span className="text-red-400 font-black">{batchToDelete.mailCount} mail</span> thuộc lô này không? Hành động này không thể hoàn tác.
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setBatchToDelete(null);
                    setShowDeleteConfirm(false);
                  }} 
                  className="flex-1 h-12 rounded-xl border border-white/10 text-white font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleConfirmDelete} 
                  className="flex-1 h-12 rounded-xl bg-red-500 text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10"
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
            className="p-2 rounded-xl bg-sidebar border border-border-custom text-gray-400 hover:text-white transition-all shadow-md"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
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
              placeholder="Tìm kiếm Lô, Người Import..."
              className="bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 h-10 text-xs text-white outline-none focus:border-gold/50 transition-all w-60"
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
          >
            <option value="ALL" className="bg-sidebar text-white">Tất cả phân loại</option>
            <option value="ROOT" className="bg-sidebar text-white">Mail Gốc</option>
            <option value="SATELLITE" className="bg-sidebar text-white">Mail Vệ Tinh</option>
            <option value="MONETIZED" className="bg-sidebar text-white">Mail BKT</option>
          </select>
        </div>
      </div>

      {/* Premium Dashboard Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tổng số Lô</span>
          <span className="text-2xl font-black text-white mt-1">{stats.total} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Lô Mail Gốc</span>
          <span className="text-2xl font-black text-indigo-400 mt-1">{stats.rootCount} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Lô Vệ Tinh</span>
          <span className="text-2xl font-black text-sky-400 mt-1">{stats.satelliteCount} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Lô Mail BKT</span>
          <span className="text-2xl font-black text-emerald-400 mt-1">{stats.monetizedCount} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[9px] font-black text-gold uppercase tracking-widest">Tổng số Mail</span>
          <span className="text-2xl font-black text-gold mt-1">{stats.totalMails} <span className="text-xs text-gray-500">Mail</span></span>
        </div>
      </div>

      {/* Grid view of Batch Cards ("Dạng ô") */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {filteredBatches.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredBatches.map((batch, index) => (
                <motion.div
                  key={batch.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-sidebar border border-white/5 border-t-4 ${getCardBorder(batch.type)} rounded-[24px] p-6 shadow-xl hover:shadow-2xl flex flex-col justify-between relative group transition-all`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border ${getTypeStyle(batch.type)}`}>
                        {getTypeName(batch.type)}
                      </span>
                      <button 
                        onClick={() => {
                          setBatchToDelete(batch);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                        title="Xóa Lô Mail"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Batch Name */}
                    <h3 className="text-md font-black text-white mt-4 uppercase tracking-tight group-hover:text-gold transition-colors leading-tight">
                      {batch.name}
                    </h3>

                    {/* Dynamic Graphic Counter */}
                    <div className="flex items-baseline gap-1.5 my-3 bg-black/10 rounded-xl p-3 border border-white/[0.02]">
                      <span className="text-3xl font-black text-gold tracking-tighter leading-none">{batch.mailCount}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Tài khoản Mail</span>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-500" />
                        Ngày import:
                      </span>
                      <span className="text-gray-300 font-mono">{batch.importedAt}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={12} className="text-gray-500" />
                        Người import:
                      </span>
                      <span className="text-gray-300">{batch.importedBy}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="h-60 rounded-3xl border border-white/5 bg-sidebar/20 flex flex-col items-center justify-center text-center p-6">
            <FolderOpen size={48} className="text-gray-600 mb-3" />
            <h4 className="text-white font-black uppercase tracking-tight">Không tìm thấy lô mail nào</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">Thử đổi từ khóa tìm kiếm hoặc phân loại để tìm kiếm lô tương ứng</p>
          </div>
        )}
      </div>
    </div>
  );
}
