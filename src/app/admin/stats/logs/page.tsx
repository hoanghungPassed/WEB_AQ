"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Terminal, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  RefreshCw,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface LogItem {
  id: string;
  user: any; // Allow object or string
  role: "ADMIN" | "QL CÔNG VIỆC" | "NHÂN VIÊN";
  action: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  timestamp: string;
}

export default function SystemLogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");
  
  // Clear Logs confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

    const loadLogs = async () => {
      try {
        const response = await fetch("/api/admin/logs");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const normalizedLogs = data.map((log: any) => {
              return {
                id: log._id || log.id,
                user: log.user, // Keep as-is, we'll render it safely in JSX
                role: log.role || "ADMIN",
                action: log.action || log.message || "",
                type: log.type || "INFO",
                timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : (log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "")
              };
            });
            setLogs(normalizedLogs);
            return;
          }
        }
      } catch (err) {
        console.error("Error loading logs:", err);
      }
      setLogs([]);
    };

    loadLogs();
    return () => undefined;
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs", {
        method: "DELETE"
      });
      if (res.ok) {
        setLogs([]);
        setShowClearConfirm(false);
        triggerToast("Đã dọn dẹp sạch nhật ký hoạt động hệ thống!");
      } else {
        triggerToast("Lỗi khi xóa nhật ký!");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Lỗi kết nối!");
    }
  };

  const getSeverityStyle = (t: string) => {
    if (t === "SUCCESS") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (t === "INFO") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (t === "WARNING") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  const getRoleStyle = (r: string) => {
    if (r === "ADMIN") return "text-amber-500 font-semibold";
    if (r === "QL CÔNG VIỆC") return "text-amber-500 font-medium";
    return "text-zinc-400";
  };

  // Safe user display helper to prevent direct object rendering
  const renderUserDisplay = (userVal: any) => {
    if (!userVal) return "Hệ thống";
    if (typeof userVal === "object") {
      return userVal.name || userVal.username || "Hệ thống";
    }
    return String(userVal);
  };

  const filteredLogs = (logs || []).filter(l => {
    const userStr = renderUserDisplay(l.user).toLowerCase();
    const actionStr = (l.action || "").toLowerCase();
    const matchesSearch = actionStr.includes(searchTerm.toLowerCase()) || userStr.includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || l.type === typeFilter;
    const matchesRole = roleFilter === "ALL" || l.role === roleFilter;
    return matchesSearch && matchesType && matchesRole;
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 pb-6 relative overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} 
            animate={{ opacity: 1, y: 30, x: "-50%" }} 
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-amber-600 border border-amber-500/35 px-6 py-3 rounded-xl text-white font-bold text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Logs Warning Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-tight">Xóa Nhật Ký</h3>
                  <p className="text-[10px] text-red-400 font-semibold uppercase tracking-widest mt-0.5">Xác nhận dọn dẹp</p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6 text-sm text-zinc-300 leading-relaxed font-medium">
                Bạn có chắc chắn muốn xóa toàn bộ nhật ký hệ thống không? Hành động này sẽ dọn sạch tất cả dữ liệu lịch sử và không thể khôi phục lại.
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowClearConfirm(false)} 
                  className="flex-1 h-12 rounded-xl border border-white/0 text-zinc-300 font-semibold uppercase text-xs tracking-wider hover:bg-zinc-800 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleClearLogs} 
                  className="flex-1 h-12 rounded-xl bg-red-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
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
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/0 text-zinc-400 hover:text-zinc-100 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-3">
              <Terminal className="text-amber-500" size={24} />
              Nhật Ký Hoạt Động (Logs)
            </h2>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1">
              Nhật ký ghi nhận lịch sử thao tác của các nhân sự trên hệ thống
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={14} />
            <input 
              placeholder="Tìm kiếm tác vụ, tài khoản..."
              className="bg-zinc-900 border border-border rounded-md pl-12 pr-4 h-10 text-sm text-zinc-100 outline-none focus:border-amber-500/50 transition-all w-60"
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={() => setShowClearConfirm(true)}
            className="h-10 px-4 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-red-900/20"
          >
            <Trash2 size={14} /> Dọn dẹp logs
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 bg-zinc-900 border border-white/0 rounded-xl p-4">
        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Filter size={12} /> Bộ lọc nâng cao:</span>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-950 border border-white/0 rounded-xl px-4 h-9 text-xs text-amber-500 font-bold uppercase tracking-wider outline-none focus:border-amber-500 cursor-pointer transition-all"
        >
          <option value="ALL" className="bg-zinc-900 text-zinc-100">Mọi mức độ</option>
          <option value="SUCCESS" className="bg-zinc-900 text-zinc-100">Thành công (SUCCESS)</option>
          <option value="INFO" className="bg-zinc-900 text-zinc-100">Thông tin (INFO)</option>
          <option value="WARNING" className="bg-zinc-900 text-zinc-100">Cảnh báo (WARNING)</option>
          <option value="ERROR" className="bg-zinc-900 text-zinc-100">Lỗi nghiêm trọng (ERROR)</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-zinc-950 border border-white/0 rounded-xl px-4 h-9 text-xs text-amber-500 font-bold uppercase tracking-wider outline-none focus:border-amber-500 cursor-pointer transition-all"
        >
          <option value="ALL" className="bg-zinc-900 text-zinc-100">Tất cả chức vụ</option>
          <option value="ADMIN" className="bg-zinc-900 text-zinc-100">ADMIN</option>
          <option value="QL CÔNG VIỆC" className="bg-zinc-900 text-zinc-100">QL CÔNG VIỆC</option>
          <option value="NHÂN VIÊN" className="bg-zinc-900 text-zinc-100">NHÂN VIÊN</option>
        </select>

        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 ml-auto uppercase tracking-wider">
          Tổng log: {(filteredLogs || []).length}
        </span>
      </div>

      {/* Main Table Display */}
      <div className="bg-zinc-900 border border-white/0 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-white/0 bg-zinc-950 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-2">
            <Terminal size={16} className="text-amber-500" />
            Nhật ký sự kiện thời gian thực
          </h3>
          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin text-amber-500/70" /> Đang theo dõi...</span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-white/0 sticky top-0 z-10">
              <tr>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-[10px]">Thời gian</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-[10px]">Mức độ</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-[10px]">Nhân sự</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-[10px]">Chức vụ</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-[10px]">Hành động ghi nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {(filteredLogs || []).length > 0 ? (
                (filteredLogs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3 px-6 text-xs text-zinc-400 font-mono font-medium">{log.timestamp}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-widest uppercase border ${getSeverityStyle(log.type)}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 px-6 font-bold text-zinc-100">{renderUserDisplay(log.user)}</td>
                    <td className="py-3 px-6 text-[10px] font-bold uppercase tracking-wider">
                      <span className={getRoleStyle(log.role)}>{log.role}</span>
                    </td>
                    <td className="py-3 px-6 text-sm text-zinc-300 truncate max-w-lg font-medium group-hover:text-amber-500 transition-colors">
                      {log.action}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-400 font-bold uppercase tracking-widest">
                    Không tìm thấy sự kiện nào tương ứng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

