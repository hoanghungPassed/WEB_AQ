"use client";

import React, { useState, useEffect } from"react";
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
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";

interface LogItem {
 id: string;
 user: string;
 role:"ADMIN" |"QL CÔNG VIỆC" |"NHÂN VIÊN";
 action: string;
 type:"INFO" |"SUCCESS" |"WARNING" |"ERROR";
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
 const role = String(parsedUser.role ||"").toUpperCase();
 if (role !=="01" && role !=="02" && role !=="ADMIN" && role !=="QUẢN LÝ CÔNG VIỆC" && role !=="QL CÔNG VIỆC") {
 window.location.href ="/admin";
 }
 } else {
 window.location.href ="/login";
 }

 const loadLogs = async () => {
 try {
 const response = await fetch("/api/admin/logs");
 if (response.ok) {
 const data = await response.json();
 if (Array.isArray(data)) {
 const normalizedLogs = data.map((log: any) => ({
 id: log._id || log.id,
 user: log.userName || log.user ||"Hệ thống",
 role: log.role ||"ADMIN",
 action: log.action || log.message ||"",
 type: log.type ||"INFO",
 timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : (log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") :"")
 }));
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

 const handleClearLogs = () => {
 setLogs([]);
 setShowClearConfirm(false);
 triggerToast("Đã dọn dẹp sạch nhật ký hoạt động hệ thống!");
 };

 const getSeverityStyle = (t: string) => {
 if (t ==="SUCCESS") return"bg-green-500/10 text-green-400 border-green-500/20";
 if (t ==="INFO") return"bg-blue-500/10 text-blue-400 border-blue-500/20";
 if (t ==="WARNING") return"bg-amber-500/10 text-amber-400 border-amber-500/20";
 return"bg-red-500/10 text-red-400 border-red-500/20";
 };

 const getRoleStyle = (r: string) => {
 if (r ==="ADMIN") return"text-indigo-400";
 if (r ==="QL CÔNG VIỆC") return"text-gold";
 return" text-gray-400";
 };

 const filteredLogs = (logs || []).filter(l => {
 const matchesSearch = l.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
 l.user.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesType = typeFilter ==="ALL" || l.type === typeFilter;
 const matchesRole = roleFilter ==="ALL" || l.role === roleFilter;
 return matchesSearch && matchesType && matchesRole;
 });

 return (
 <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 pb-6 relative overflow-hidden">
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

 {/* Clear Logs Warning Modal */}
 <AnimatePresence>
 {showClearConfirm && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 z-[150] bg-white/90 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
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
 <h3 className="text-xl font-black text-white uppercase tracking-tighter">Xóa Nhật Ký</h3>
 <p className="text-[10px] text-red-500/70 font-black uppercase tracking-widest mt-0.5">Xác nhận dọn dẹp</p>
 </div>
 </div>

 <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6 text-sm text-gray-300 font-bold leading-relaxed">
 Bạn có chắc chắn muốn xóa toàn bộ nhật ký hệ thống không? Hành động này sẽ dọn sạch tất cả dữ liệu lịch sử và không thể khôi phục lại.
 </div>

 <div className="flex gap-4">
 <button 
 onClick={() => setShowClearConfirm(false)} 
 className="flex-1 h-12 rounded-xl border border-white/10 text-white font-bold uppercase text-sm tracking-widest hover:bg-white bg-zinc-900/5 transition-all"
 >
 Hủy bỏ
 </button>
 <button 
 onClick={handleClearLogs} 
 className="flex-1 h-12 rounded-xl bg-red-500 text-white font-black uppercase text-sm tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10"
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
 className="p-2 rounded-xl bg-sidebar border border-border-custom text-gray-400 hover:text-gray-900 text-white transition-all shadow-md"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <Terminal className="text-gold" size={28} />
 Nhật Ký Hoạt Động (Logs)
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Nhật ký ghi nhận lịch sử thao tác của các nhân sự trên hệ thống
 </p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <div className="relative group">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
 <input 
 placeholder="Tìm kiếm tác vụ, tài khoản..."
 className="bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 h-10 text-sm text-white outline-none focus:border-gold/50 transition-all w-60"
 type="text" 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>

 <button 
 onClick={() => setShowClearConfirm(true)}
 className="h-10 px-4 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-gray-900 text-white transition-all text-sm font-black uppercase tracking-wider flex items-center gap-2 border border-red-500/20"
 >
 <Trash2 size={14} /> Dọn dẹp logs
 </button>
 </div>
 </div>

 {/* Filters Row */}
 <div className="flex flex-wrap items-center gap-4 bg-sidebar/30 border border-white/5 rounded-2xl p-6">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1.5"><Filter size={12} /> Bộ lọc nâng cao:</span>
 
 <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="bg-black/20 border border-white/10 rounded-xl px-4 h-9 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-sidebar text-white">Mọi mức độ</option>
 <option value="SUCCESS" className="bg-sidebar text-white">Thành công (SUCCESS)</option>
 <option value="INFO" className="bg-sidebar text-white">Thông tin (INFO)</option>
 <option value="WARNING" className="bg-sidebar text-white">Cảnh báo (WARNING)</option>
 <option value="ERROR" className="bg-sidebar text-white">Lỗi nghiêm trọng (ERROR)</option>
 </select>

 <select
 value={roleFilter}
 onChange={(e) => setRoleFilter(e.target.value)}
 className="bg-black/20 border border-white/10 rounded-xl px-4 h-9 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-sidebar text-white">Tất cả chức vụ</option>
 <option value="ADMIN" className="bg-sidebar text-white">ADMIN</option>
 <option value="QL CÔNG VIỆC" className="bg-sidebar text-white">QL CÔNG VIỆC</option>
 <option value="NHÂN VIÊN" className="bg-sidebar text-white">NHÂN VIÊN</option>
 </select>

 <span className="text-[10px] font-black text-gold/80 bg-gold/10 px-3 py-1 rounded-full border border-gold/20 ml-auto uppercase tracking-widest">
 Tổng log: {(filteredLogs || []).length}
 </span>
 </div>

 {/* Main Table Display */}
 <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
 <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
 <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
 <Terminal size={18} className="text-gold" />
 Nhật ký sự kiện thời gian thực
 </h3>
 <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin text-gold/50" /> Đang theo dõi...</span>
 </div>

 <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
 <table className="w-full text-left text-base whitespace-nowrap min-w-[1000px]">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5 sticky top-0 z-10">
 <tr>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Thời gian</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Mức độ</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân sự</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Chức vụ</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Hành động ghi nhận</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(filteredLogs || []).length > 0 ? (
 (filteredLogs || []).map((log) => (
 <tr key={log.id} className="hover:bg-white bg-zinc-900/[0.02] transition-colors group">
 <td className="py-4 px-6 text-sm text-gray-400 font-mono font-bold">{log.timestamp}</td>
 <td className="py-4 px-6 text-sm">
 <span className={`px-3 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border ${getSeverityStyle(log.type)}`}>
 {log.type}
 </span>
 </td>
 <td className="py-4 px-6 font-black text-white text-sm">{log.user}</td>
 <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">
 <span className={getRoleStyle(log.role)}>{log.role}</span>
 </td>
 <td className="py-4 px-6 text-sm text-gray-300 truncate max-w-lg font-bold group-hover:text-gold transition-colors">
 {log.action}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="py-20 text-center font-bold uppercase tracking-widest">
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
