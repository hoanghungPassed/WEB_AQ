"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Zap,
  TrendingUp,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FineReport } from "@/types/admin";

export default function FinesReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [fineReports, setFineReports] = useState<FineReport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PAID" | "OVERDUE">("ALL");
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      window.location.href = "/login";
    }

    const fetchFines = async () => {
      try {
        const res = await fetch("/api/admin/fines");
        if (res.ok) {
          const data = await res.json();
          // Map to match frontend format
          const mapped = data.map((d: any) => ({
            id: d._id,
            staffId: d.userId?._id || "",
            staffName: d.userId?.name || "Unknown",
            reason: d.reason,
            amount: d.amount,
            status: d.status,
            date: new Date(d.createdAt).toISOString().split('T')[0]
          }));
          setFineReports(mapped);
        }
      } catch (err) {
        console.error("Error fetching fines:", err);
      }
    };
    fetchFines();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Filter và search
  const filteredReports = useMemo(() => {
    let result = [...fineReports];

    // Filter by status
    if (filterStatus !== "ALL") {
      result = (result || []).filter(r => r.status === filterStatus);
    }

    // Search by staff name or reason
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = (result || []).filter(r => 
        r.staffName.toLowerCase().includes(query) || 
        r.reason.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [fineReports, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalFines = (fineReports || []).length;
    const totalAmount = fineReports.reduce((sum, r) => sum + r.amount, 0);
    const paidAmount = fineReports
      .filter(r => r.status === "PAID")
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingAmount = fineReports
      .filter(r => r.status === "PENDING" || r.status === "OVERDUE")
      .reduce((sum, r) => sum + r.amount, 0);
    const paidCount = (fineReports || []).filter(r => r.status === "PAID").length;
    const pendingCount = (fineReports || []).filter(r => r.status === "PENDING").length;
    const overdueCount = (fineReports || []).filter(r => r.status === "OVERDUE").length;

    return { totalFines, totalAmount, paidAmount, pendingAmount, paidCount, pendingCount, overdueCount };
  }, [fineReports]);

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch("/api/admin/fines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "PAID" })
      });
      if (res.ok) {
        const updated = (fineReports || []).map(r => r.id === id ? { ...r, status: "PAID" as const } : r);
        setFineReports(updated);
        triggerToast("Đã cập nhật thanh toán!");
      } else {
        const errData = await res.json().catch(() => ({}));
        triggerToast(errData.error || "Lỗi cập nhật!");
      }
    } catch (err) {
      triggerToast("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDeleteFine = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;
    try {
      const res = await fetch(`/api/admin/fines?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const updated = (fineReports || []).filter(r => r.id !== id);
        setFineReports(updated);
        triggerToast("Đã xóa báo cáo!");
      } else {
        const errData = await res.json().catch(() => ({}));
        triggerToast(errData.error || "Lỗi xóa báo cáo!");
      }
    } catch (err) {
      triggerToast("Lỗi khi xóa báo cáo");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Nhân viên", "Lí do", "Số tiền", "Ngày lập", "Trạng thái", "Ghi chú"];
    const rows = (filteredReports || []).map(r => [
      r.staffName,
      r.reason,
      `${r.amount.toLocaleString("vi-VN")} ₫`,
      r.date,
      r.status,
      r.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...(rows || []).map(row => (row || []).map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fine-reports-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();

    triggerToast("Đã xuất báo cáo thành công!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 border-green-500/30 text-green-400";
      case "PENDING":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "OVERDUE":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle2 size={16} />;
      case "OVERDUE":
        return <AlertCircle size={16} />;
      case "PENDING":
        return <Clock size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Đã thanh toán";
      case "PENDING":
        return "Chưa thanh toán";
      case "OVERDUE":
        return "Quá hạn";
      default:
        return status;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-6 pb-6 overflow-hidden">
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

      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push("/admin")}
          className="p-2 rounded-xl bg-white dark:bg-sidebar border border-border-custom text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <FileText className="text-gold" size={28} />
            Báo Cáo Đi Muộn & Phạt
          </h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
            Chi tiết nhân viên nộp phạt, lí do và trạng thái thanh toán
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
                Tổng Báo Cáo
              </p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalFines}</p>
            </div>
            <div className="p-3 bg-gold/10 rounded-xl">
              <FileText className="text-gold" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
                Tổng Tiền
              </p>
              <p className="text-xl font-black text-gold">
                {(stats.totalAmount / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-gold/10 rounded-xl">
              <DollarSign className="text-gold" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-sidebar border border-green-500/20 rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-1">
                Đã Thanh Toán
              </p>
              <p className="text-xl font-black text-green-400">{stats.paidCount}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <CheckCircle2 className="text-green-400" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-sidebar border border-yellow-500/20 rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-1">
                Chờ Thanh Toán
              </p>
              <p className="text-xl font-black text-yellow-400">{stats.pendingCount}</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <Clock className="text-yellow-400" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-sidebar border border-red-500/20 rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">
                Quá Hạn
              </p>
              <p className="text-xl font-black text-red-400">{stats.overdueCount}</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertCircle className="text-red-400" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center shrink-0">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên hoặc lí do..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-sidebar border border-border-custom rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-500 outline-none focus:border-gold/50 transition-all"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["ALL", "PENDING", "PAID", "OVERDUE"] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filterStatus === status
                  ? "bg-gold text-sidebar shadow-lg shadow-gold/20"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              {status === "ALL" ? "Tất Cả" : status === "PENDING" ? "Chờ TT" : status === "PAID" ? "Đã TT" : "Quá Hạn"}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-gray-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
        >
          <Download size={16} /> Xuất CSV
        </button>
      </div>

      {/* Fine Reports Table */}
      <div className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl shadow-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full relative">
            <thead className="sticky top-0 bg-white dark:bg-[#0d0d0d] z-10 shadow-sm border-b border-gray-200 dark:border-white/5">
              <tr className="bg-gray-50 dark:bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Nhân Viên
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Lí Do
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Số Tiền
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Ngày Lập
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Trạng Thái
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody>
              {(filteredReports || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={32} className="text-gray-600 opacity-50" />
                      <p className="text-gray-500 font-bold">Chưa có dữ liệu</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (filteredReports || []).map((report, idx) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-border-custom hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                          <User size={16} className="text-gold" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{report.staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{report.reason}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-gold">
                        {report.amount.toLocaleString("vi-VN")} ₫
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} />
                        {report.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(
                          report.status
                        )}`}
                      >
                        {getStatusIcon(report.status)}
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {getStatusText(report.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {report.status !== "PAID" && (
                          <button
                            onClick={() => handleMarkAsPaid(report.id)}
                            className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            title="Đánh dấu đã thanh toán"
                          >
                            Đã TT
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFine(report.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          title="Xóa báo cáo"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-gold" size={18} />
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Ghi Chú</h3>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 font-medium leading-relaxed">
          <p>• Chọn <span className="text-gold font-black">Đã TT</span> để cập nhật trạng thái thanh toán của nhân viên</p>
          <p>• Nhân viên có báo cáo <span className="text-red-400 font-black">Quá Hạn</span> chưa thanh toán sẽ được thông báo</p>
          <p>• Xuất CSV để lưu trữ hoặc chia sẻ báo cáo chi tiết</p>
        </div>
      </div>
    </div>
  );
}
