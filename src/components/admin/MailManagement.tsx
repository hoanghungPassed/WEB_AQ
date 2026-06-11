"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  X,
  ArrowLeft,
  PlusCircle,
  Trash2,
  Filter,
  ShieldCheck,
  Mail,
  Zap,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  Database,
  Layers,
  Calendar,
  User as UserIcon,
  Loader2,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import useSWR from "swr";

import { MailData } from "@/types/admin";
import MailDetailModal from "@/components/admin/MailDetailModal";
import { ImportHistoryModal, ImportHistoryItem } from "@/components/admin/modals/ImportHistoryModal";
import BatchNameModal from "@/components/admin/modals/BatchNameModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MailManagementProps {
  type?: string;
  user?: any;
}

export default function MailManagement({ type, user: initialUser }: MailManagementProps) {
  const [user, setUser] = useState<any>(initialUser || null);
  const [activeTab, setActiveTab] = useState<"ROOT" | "SATELLITE" | "MONETIZED" | "ALL">(
    (type === "ROOT" || type === "SATELLITE" || type === "MONETIZED" || type === "ALL") ? (type as any) : "ROOT"
  );

  useEffect(() => {
    if (type && (type === "ROOT" || type === "SATELLITE" || type === "MONETIZED" || type === "ALL")) {
      setActiveTab(type as any);
    }
  }, [type]);

  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // New state for View Mode: BATCHES vs MAILS
  const [viewMode, setViewMode] = useState<"BATCHES" | "MAILS">("BATCHES");

  const { data: apiData, mutate, isLoading } = useSWR(
    `/api/admin/mails?type=${activeTab}&all=true`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const mails: MailData[] = apiData?.success ? apiData.data : [];
  const batches: string[] = apiData?.batches || [];

  const [notification, setNotification] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailData | null>(null);

  const [showBatchNameModal, setShowBatchNameModal] = useState(false);
  const [pendingMails, setPendingMails] = useState<any[] | null>(null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    } else {
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    }

    const savedHistory = localStorage.getItem("mail_import_history");
    if (savedHistory) setImportHistory(JSON.parse(savedHistory));
  }, [initialUser]);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredMails = useMemo(() => {
    return mails.filter((mail) => {
      const matchesSearch =
        mail.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mail.recovery.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBatch = !selectedBatch || mail.batchName === selectedBatch;
      const matchesStatus = statusFilter === "ALL" || mail.verificationStatus === statusFilter;
      return matchesSearch && matchesBatch && matchesStatus;
    });
  }, [mails, searchQuery, selectedBatch, statusFilter]);

  // Aggregate Batch Statistics
  const batchStats = useMemo(() => {
  const stats: Record<string, { count: number, importedAt: string, type: string }> = {};

  // We can also extract info from importHistory if available
  const historyMap: Record<string, ImportHistoryItem> = {};
  importHistory.forEach(item => {
    historyMap[item.fileName] = item;
  });

  mails.forEach(m => {
    const bName = m.batchName || "Không rõ lô";
    if (!stats[bName]) {
      stats[bName] = { 
        count: 0, 
        importedAt: historyMap[bName]?.importedAt || m.createdAt?.split("T")[0] || "---", 
        type: m.type 
      };
    }
    stats[bName].count++;
  });

  // Also include empty batches from history if they match current tab type
  importHistory.forEach(item => {
    if ((activeTab === "ALL" || item.type === activeTab) && !stats[item.fileName]) {
      stats[item.fileName] = { count: 0, importedAt: item.importedAt, type: item.type };
    }
  });
    return Object.entries(stats).map(([name, info]) => ({
      name,
      ...info
    })).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }, [mails, importHistory, activeTab]);

  const totalPages = Math.ceil(filteredMails.length / itemsPerPage);
  const paginatedMails = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMails.slice(start, start + itemsPerPage);
  }, [filteredMails, currentPage]);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedMails = jsonData.map((row: any, idx: number) => ({
          email: row.Email || row.email || "",
          password: row.Password || row.password || "123456",
          recovery: row.Recovery || row.recovery || "",
          phone: row.Phone || row.phone || "",
          type: activeTab,
          verificationStatus: "Chưa check",
          workStatus: activeTab === "ROOT" ? "Đang xử lý" : (activeTab === "MONETIZED" ? "Chưa bán" : "Chưa làm"),
          stt: idx + 1
        })).filter((m: any) => m.email);

        if (importedMails.length === 0) {
          triggerToast("File Excel không hợp lệ hoặc trống!");
          setIsImporting(false);
          return;
        }

        setPendingMails(importedMails);
        setShowBatchNameModal(true);
      } catch (err) {
        console.error("Lỗi đọc file Excel:", err);
        triggerToast("Lỗi khi đọc file Excel!");
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async (batchName: string) => {
    if (!pendingMails) return;
    const finalBatchName = batchName.trim() || `Đợt Import ${new Date().toLocaleDateString("vi-VN")}`;
    
    setIsImporting(true);
    try {
      const res = await fetch("/api/admin/mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mails: pendingMails.map(m => ({ ...m, batchName: finalBatchName })),
          batchName: finalBatchName,
          type: activeTab
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Save to history
        const newHistoryItem: ImportHistoryItem = {
          id: `imp-${Date.now()}`,
          fileName: finalBatchName,
          quantity: pendingMails.length,
          importedAt: new Date().toISOString().split("T")[0],
          type: activeTab,
          importedBy: user?.name || "Admin"
        };
        const updatedHistory = [newHistoryItem, ...importHistory];
        setImportHistory(updatedHistory);
        localStorage.setItem("mail_import_history", JSON.stringify(updatedHistory));

        triggerToast(`Đã nạp thành công ${pendingMails.length} mail vào lô "${finalBatchName}"`);
        mutate();
        setViewMode("BATCHES");
      } else {
        triggerToast(data.error || "Lỗi khi nạp mail!");
      }
    } catch (err) {
      console.error("Lỗi API import:", err);
      triggerToast("Lỗi kết nối Server!");
    } finally {
      setIsImporting(false);
      setShowBatchNameModal(false);
      setPendingMails(null);
    }
  };

  const handleDeleteBatch = async (batchName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa TOÀN BỘ mail thuộc lô "${batchName}" không?`)) return;

    try {
      const res = await fetch(`/api/admin/mails?batchName=${encodeURIComponent(batchName)}&type=${activeTab}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast(`Đã xóa thành công lô "${batchName}"`);
        // Remove from history
        const updatedHistory = importHistory.filter(h => h.fileName !== batchName);
        setImportHistory(updatedHistory);
        localStorage.setItem("mail_import_history", JSON.stringify(updatedHistory));
        mutate();
      }
    } catch (err) {
      triggerToast("Lỗi khi xóa lô mail!");
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 select-none">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -50, x: "-50%" }} className="fixed top-0 left-1/2 z-[500] bg-gold text-sidebar px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase text-sm border border-white/10">
            <CheckCircle size={20} /> {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {viewMode === "MAILS" && (
            <button 
              onClick={() => { setViewMode("BATCHES"); setSelectedBatch(null); }}
              className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-gold transition-all"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Database className="text-gold" size={28} />
              Quản lý Kho Mail AQ
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {viewMode === "BATCHES" ? "Danh sách các đợt nạp mail hệ thống" : `Chi tiết Lô: ${selectedBatch}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="h-12 px-5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border border-white/0"
          >
            <RotateCcw size={16} /> Lịch sử nạp
          </button>
          
          <label className={`h-12 px-6 bg-gold hover:bg-gold-hover text-sidebar rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-gold/20 ${isImporting ? "opacity-50 cursor-not-allowed" : ""}`}>
            {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            {isImporting ? "Đang xử lý..." : "Nạp Excel Mới"}
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" disabled={isImporting} />
          </label>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-4 flex-shrink-0">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/0">
          {(["ALL", "ROOT", "SATELLITE", "MONETIZED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setViewMode("BATCHES"); setSelectedBatch(null); }}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? "bg-gold text-sidebar shadow-lg" : "text-gray-500 hover:text-white"
              }`}
            >
              {tab === "ALL" ? "Tất cả" : tab === "ROOT" ? "Mail Gốc" : tab === "SATELLITE" ? "Vệ Tinh" : "Kiếm Tiền"}
            </button>
          ))}
        </div>

        <div className="flex-1 flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm email, lô, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl pl-12 pr-6 text-white text-sm outline-none focus:border-white/10 transition-all shadow-inner"
            />
          </div>
          {viewMode === "MAILS" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-14 px-6 bg-white/5 border border-white/0 rounded-2xl text-white text-sm font-bold outline-none cursor-pointer focus:border-white/10 transition-all"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đã xanh">Đã xanh</option>
              <option value="Lỗi">Lỗi</option>
              <option value="Chưa check">Chưa check</option>
            </select>
          )}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 min-h-0 bg-sidebar border border-white/0 rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="animate-spin text-gold" size={48} />
            <p className="text-sm font-black uppercase tracking-[0.2em]">Đang tải dữ liệu...</p>
          </div>
        ) : viewMode === "BATCHES" ? (
          /* BATCH LIST VIEW */
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {batchStats.map((batch) => (
                <motion.div
                  key={batch.name}
                  whileHover={{ scale: 1.02 }}
                  className="group bg-white/0 border border-white/5 rounded-3xl p-6 hover:bg-gold/5 transition-all cursor-pointer relative overflow-hidden"
                  onClick={() => { setSelectedBatch(batch.name); setViewMode("MAILS"); setCurrentPage(1); }}
                >
                  <div className="absolute top-0 right-0 h-24 w-24 bg-gold/5 blur-2xl -mr-12 -mt-12 group-hover:bg-gold/10 transition-all" />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-sidebar transition-all">
                      <Layers size={24} />
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.name); }}
                      className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1 group-hover:text-gold transition-colors truncate">
                    {batch.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
                    <Calendar size={12} /> {batch.importedAt}
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-2xl font-black text-white">{batch.count}</span>
                    <span className="text-[10px] font-black text-gray-500 uppercase">Tài khoản</span>
                  </div>
                </motion.div>
              ))}
              {batchStats.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-20">
                  <Mail size={80} className="mb-4" />
                  <p className="text-2xl font-black uppercase tracking-widest">Chưa có đợt nạp nào</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MAIL LIST VIEW */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 bg-[#0a0a0a] z-20 shadow-xl">
                  <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="px-8 py-5">STT</th>
                    <th className="px-6 py-5">Email</th>
                    <th className="px-6 py-5">Mật khẩu / Recovery</th>
                    <th className="px-6 py-5">Trạng thái</th>
                    <th className="px-6 py-5">Người gán</th>
                    <th className="px-8 py-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedMails.map((mail, idx) => (
                    <tr key={mail.id} className="group hover:bg-white/5 transition-all">
                      <td className="px-8 py-4 text-xs font-black text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-white group-hover:text-gold transition-colors">{mail.email}</p>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">{mail.batchName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono text-gray-400">{mail.password}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{mail.recovery}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          mail.verificationStatus === "Đã xanh" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          mail.verificationStatus === "Lỗi" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        }`}>
                          {mail.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black ${mail.assigneeName ? "text-gold" : "text-gray-600"}`}>
                            {mail.assigneeName ? mail.assigneeName.charAt(0) : "?"}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            {mail.assigneeName || "Sẵn sàng"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button 
                          onClick={() => setSelectedMail(mail)}
                          className="h-9 px-4 bg-white/5 hover:bg-gold text-white hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Cấu hình
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Hiển thị <span className="text-white">{paginatedMails.length}</span> / <span className="text-white">{filteredMails.length}</span> mail
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="h-10 px-4 bg-gold/10 text-gold rounded-xl flex items-center justify-center text-xs font-black">
                  Trang {currentPage} / {totalPages || 1}
                </div>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMail && (
          <MailDetailModal 
            mail={selectedMail} 
            type={activeTab === "ALL" ? selectedMail.type : activeTab}
            user={user}
            onClose={() => setSelectedMail(null)} 
            onSave={(updated) => { triggerToast("Đã cập nhật thành công!"); mutate(); }}
          />
        )}
        
        {showHistory && (
          <ImportHistoryModal
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            importHistory={importHistory}
            onDeleteRow={(id) => {
              const updated = importHistory.filter(h => h.id !== id);
              setImportHistory(updated);
              localStorage.setItem("mail_import_history", JSON.stringify(updated));
            }}
            onClearAll={() => {
              if (confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử import?")) {
                setImportHistory([]);
                localStorage.setItem("mail_import_history", JSON.stringify([]));
              }
            }}
          />
        )}

        {showBatchNameModal && (
          <BatchNameModal
            isOpen={showBatchNameModal}
            onClose={() => { setPendingMails(null); setShowBatchNameModal(false); }}
            onConfirm={confirmImport}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
