"use client";

import React, { useState, useEffect, useMemo, useCallback } from"react";
import { 
 Phone, 
 Search,
 CheckCircle2,
 FolderOpen,
 ArrowLeft,
 ChevronDown,
 Activity,
 Award,
 AlertOctagon,
 ShieldCheck,
 CheckSquare,
 Loader2
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";
import type { PhoneItem, PhoneStatus, StaffData } from"@/types/admin";
import useSWR from "swr";
import { Badge } from "@/components/ui/Badge";
import { LoadingOverlay } from "@/components/ui/Loading";

export default function EmployeePhoneListPage() {
 const router = useRouter();
 const [user, setUser] = useState<StaffData | null>(null);
 const [toastMsg, setToastMsg] = useState("");
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("ALL");

 useEffect(() => {
  const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (storedUser) {
    setUser(JSON.parse(storedUser));
  } else {
    router.push("/login");
  }
 }, [router]);

 const fetchPhones = useCallback(async () => {
    if (!user) return null;
    const res = await fetch("/api/admin/phones");
    if (!res.ok) throw new Error("Failed to fetch phones");
    const data = await res.json();
    
    const phonesList: PhoneItem[] = (data.data || []).map((p: any) => ({
      ...p,
      id: p._id?.toString() || p.id,
    }));
    
    return phonesList;
 }, [user]);

 const { data: myPhones, mutate, isValidating: isLoading } = useSWR(
    user ? `my-phones-${user.id || (user as any).userId || user._id}` : null,
    fetchPhones,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
 );

 const triggerToast = (msg: string) => {
 setToastMsg(msg);
 setTimeout(() => setToastMsg(""), 3000);
 };

 const handleUpdateStatus = async (phoneId: string, newStatus: PhoneStatus) => {
 try {
 const res = await fetch("/api/admin/phones", {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 id: phoneId,
 status: newStatus
 })
 });
 if (res.ok) {
 const targetNumber = (myPhones || []).find(p => p.id === phoneId)?.number ||"";
 
 fetch("/api/admin/logs", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 user: user?.id || user?.name ||"Employee",
 role:"NHÂN VIÊN",
 action: `Cập nhật trạng thái SĐT ${targetNumber} thành "${newStatus}"`,
 type: newStatus ==="Lỗi" ?"WARNING" :"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 })
 }).catch(console.error);

 mutate(); 
 triggerToast(`Đã lưu trạng thái "${newStatus}" cho số ${targetNumber}!`);
 }
 } catch(err) {
 console.error(err);
 triggerToast("Lỗi cập nhật!");
 }
 };

 const stats = useMemo(() => {
 const total = (myPhones || []).length;
 const pending = (myPhones || []).filter(p => p.status ==="Chưa làm" || p.status === "ASSIGNED" || p.status === ("Chưa verify" as any)).length;
 const xm1 = (myPhones || []).filter(p => p.status ==="XM lần 1").length;
 const xm2 = (myPhones || []).filter(p => p.status ==="XM lần 2").length;
 const errorCount = (myPhones || []).filter(p => p.status ==="Lỗi").length;
 const progress = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
 return { total, pending, xm1, xm2, errorCount, progress };
 }, [myPhones]);

 const filteredPhones = (myPhones || []).filter(p => {
 const matchesSearch = p.number.includes(searchTerm) || p.importBatch?.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = statusFilter ==="ALL" || p.status === statusFilter || (statusFilter === "Chưa làm" && p.status === "ASSIGNED");
 return matchesSearch && matchesStatus;
 });

 return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative">
 {/* Toast Alert */}
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

 {/* Header section */}
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
 Danh sách SĐT xác minh
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Danh sách 25 số điện thoại được giao để xác minh trong ngày
 </p>
 </div>
 </div>
 </div>

 {/* Stats row & Progress Bar */}
 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
 {/* Progress Card */}
 <div className="md:col-span-4 bg-sidebar border border-white/0 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-32 relative overflow-hidden group">
 <div className="absolute right-[-10px] bottom-[-10px] text-white/5 group-hover:scale-110 transition-transform">
 <CheckSquare size={120} />
 </div>
 <div>
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Tiến độ công việc SĐT</span>
 <span className="text-3xl font-black text-white mt-1">{stats.total - stats.pending} <span className="text-base text-gray-500">/ {stats.total} Số</span></span>
 </div>
 <div className="w-full bg-white/5 rounded-full h-2 mt-4 relative">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${stats.progress}%` }}
 className="bg-gold h-full rounded-full"
 transition={{ duration: 0.5 }}
 />
 </div>
 </div>

 {/* Breakdown Stats */}
 <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="bg-sidebar/40 border border-white/0 rounded-2xl p-6 flex flex-col justify-between h-24">
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
 <Activity size={12} className="text-indigo-400" /> Chưa làm
 </span>
 <span className="text-2xl font-black text-white mt-1">{stats.pending}</span>
 </div>

 <div className="bg-sidebar/40 border border-white/0 rounded-2xl p-6 flex flex-col justify-between h-24">
 <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1">
 <Award size={12} /> XM lần 1
 </span>
 <span className="text-2xl font-black text-yellow-500 mt-1">{stats.xm1}</span>
 </div>

 <div className="bg-sidebar/40 border border-white/0 rounded-2xl p-6 flex flex-col justify-between h-24">
 <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
 <ShieldCheck size={12} /> XM lần 2
 </span>
 <span className="text-2xl font-black text-green-500 mt-1">{stats.xm2}</span>
 </div>

 <div className="bg-sidebar/40 border border-white/0 rounded-2xl p-6 flex flex-col justify-between h-24">
 <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
 <AlertOctagon size={12} /> Báo lỗi
 </span>
 <span className="text-2xl font-black text-red-500 mt-1">{stats.errorCount}</span>
 </div>
 </div>
 </div>

 {/* Interactive Table Panel */}
 <div className="bg-sidebar border border-white/0 rounded-[36px] p-6 shadow-2xl flex-1 flex flex-col justify-between min-h-[400px]">
 {/* Table Toolbar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/0 mb-4">
  <div className="relative flex items-center group">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors pointer-events-none" size={15} />
  <input 
  placeholder="Tìm kiếm số điện thoại..."
  className="bg-black/20 border border-white/0 rounded-md pl-14 pr-4 h-10 text-sm text-white outline-none focus:border-white/5 transition-all w-full sm:w-64"
  type="text" 
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  />
  </div>

 <div className="flex items-center gap-3">
 <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Lọc theo trạng thái:</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-zinc-900 text-white hover:bg-zinc-700">Tất cả</option>
 <option value="Chưa làm" className="bg-zinc-900 text-white hover:bg-zinc-700">Chưa làm</option>
 <option value="XM lần 1" className="bg-zinc-900 text-white hover:bg-zinc-700">XM lần 1</option>
 <option value="XM lần 2" className="bg-zinc-900 text-white hover:bg-zinc-700">XM lần 2</option>
 <option value="Lỗi" className="bg-zinc-900 text-white hover:bg-zinc-700">Lỗi</option>
 </select>
 </div>
 </div>

 {/* Table content */}
 <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/0 bg-black/10 rounded-2xl mb-4">
 <table className="w-full text-left text-sm min-w-[700px]">
 <thead className="sticky top-0 bg-[#0c0c0c] text-gray-500 border-b border-white/0 z-10 font-black uppercase text-[9px] tracking-widest">
 <tr>
 <th className="py-3.5 px-6">STT</th>
 <th className="py-3.5 px-6">Số điện thoại</th>
 <th className="py-3.5 px-6">Link OTP</th>
 <th className="py-3.5 px-6">Ngày bàn giao</th>
 <th className="py-3.5 px-6 text-center">Trạng thái hiện tại</th>
 <th className="py-3.5 px-6 text-center">Thao tác cập nhật</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(filteredPhones || []).map((p, idx) => (
 <tr key={p.id} className="hover:bg-zinc-800/50 transition-colors">
 <td className="py-4 px-6 text-gray-500 font-bold">{idx + 1}</td>
 <td className="py-4 px-6 font-bold text-white font-mono text-base tracking-wide">{p.number}</td>
 <td className="py-4 px-6 text-gray-400 font-mono text-[10px] max-w-[240px] truncate">
 {(p as any).otpLink ? (
 <a href={(p as any).otpLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
 {(p as any).otpLink}
 </a>
 ) : (
 <span className="italic">—</span>
 )}
 </td>
 <td className="py-4 px-6 text-gray-500 font-bold font-mono">{p.assignedAt}</td>
 <td className="py-4 px-6 text-center">
 <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase border ${
 p.status ==="XM lần 1" ?"bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : 
 p.status ==="XM lần 2" ?"bg-green-500/10 text-green-500 border-green-500/20" : 
 p.status ==="Lỗi" ?"bg-red-500/10 text-red-500 border-red-500/20" :"bg-gray-500/10 text-gray-400 border-white/0"
 }`}>
 {p.status === "ASSIGNED" ? "Chưa làm" : p.status}
 </span>
 </td>
 <td className="py-4 px-6 text-center">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => handleUpdateStatus(p.id,"XM lần 1")}
 className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
 p.status ==="XM lần 1" 
 ?"bg-yellow-500 text-sidebar border-yellow-600 shadow-md shadow-yellow-500/20" 
 :"bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"
 }`}
 >
 XM Lần 1
 </button>

 {p.status ==="XM lần 1" && (
 <button
 onClick={() => handleUpdateStatus(p.id,"XM lần 2")}
 className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
 >
 XM Lần 2
 </button>
 )}

 <button
 onClick={() => handleUpdateStatus(p.id,"Lỗi")}
 className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
 p.status ==="Lỗi" 
 ?"bg-red-500 text-white border-red-600 shadow-md shadow-red-500/20" 
 :"bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
 }`}
 >
 Báo Lỗi
 </button>
 </div>
 </td>
 </tr>
 ))}
 {(filteredPhones || []).length === 0 && (
 <tr>
 <td colSpan={6} className="py-12 text-center font-bold uppercase tracking-widest">
 Chưa được bàn giao số điện thoại nào trong hôm nay hoặc không khớp tìm kiếm
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
