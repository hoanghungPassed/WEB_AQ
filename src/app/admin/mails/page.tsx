"use client";

import React, { useState, useEffect, Suspense } from"react";
import { useSearchParams, useRouter } from"next/navigation";
import { motion, AnimatePresence } from"framer-motion";
import { 
 ArrowLeft, 
 Search, 
 Download, 
 ExternalLink, 
 Filter,
 ChevronLeft,
 ChevronRight,
 Mail
} from"lucide-react";
function MailTableContent() {
 const searchParams = useSearchParams();
 const router = useRouter();
 const type = searchParams.get("type") ||"all";
 
 const [currentPage, setCurrentPage] = useState(1);
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedStatus, setSelectedStatus] = useState("all");
 const [copiedText, setCopiedText] = useState("");
 const itemsPerPage = 100;

 const [mails, setMails] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   const loadMails = async () => {
     try {
       const res = await fetch("/api/admin/mails");
       const data = await res.json();
       if (data.success) {
         setMails(data.data || []);
       }
     } catch (err) {
       console.error("Lỗi fetch mails:", err);
     } finally {
       setLoading(false);
     }
   };
   loadMails();
 }, []);

 const copyToClipboard = (text: string) => {
 navigator.clipboard.writeText(text);
 setCopiedText(text);
 setTimeout(() => setCopiedText(""), 2000);
 };

 const CHANNEL_STATUS_OPTIONS = ["Chờ B2","Chờ B3","Lỗi B2","Đã bật","quay video","Đã Kháng","Die Spam","Chưa SUB","Mất kênh"
 ];

 // Lọc dữ liệu dựa trên type (LIVE, DIE, MONETIZED, ALL) và search và channelStatus
 const filteredMails = (mails || []).filter(mail => {
 let matchesType = true;
 if (type ==="live") matchesType = mail.status ==="LIVE";
 else if (type ==="die") matchesType = mail.status ==="DIE";
 else if (type ==="monetized") matchesType = (mail.type ==="MONETIZED" || !!(mail as any).isMonetized);
 
 const matchesChannelStatus = selectedStatus ==="all" || (mail.channelStatus && mail.channelStatus.includes(selectedStatus));
 const matchesSearch = mail.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
 (mail.phone && mail.phone.includes(searchTerm));
 return matchesType && matchesChannelStatus && matchesSearch;
 });

 const totalPages = Math.ceil((filteredMails || []).length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const currentItems = filteredMails.slice(startIndex, startIndex + itemsPerPage);

 const getStatusColor = (status: string) => {
 return status ==="LIVE" ?"text-green-500 bg-green-500/10" :"text-red-500 bg-red-500/10";
 };

 const getChannelStatusColor = (status: string) => {
 if (!status) return"";
 if (status.includes("Chờ") || status.includes("quay video")) return"text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
 if (status.includes("Lỗi") || status.includes("Die") || status.includes("Chưa") || status.includes("Mất")) return"text-red-500 bg-red-500/10 border-red-500/20";
 if (status.includes("Đã bật") || status.includes("Đã Kháng")) return"text-blue-400 bg-blue-500/10 border-blue-500/20";
 return" text-gray-400 bg-white/5";
 };

 return (
 <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
 {/* Toast Notification */}
 <AnimatePresence>
 {copiedText && (
 <motion.div 
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-gold px-6 py-2 rounded-full text-sidebar font-black text-base shadow-2xl"
 >
 Đã sao chép: {(copiedText || []).length > 20 ? copiedText.substring(0, 20) +"..." : copiedText}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Header & Controls */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => router.push("/admin")}
 className="p-2 rounded-xl bg-sidebar border border-white/0 text-gray-400 hover:text-white transition-all"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 uppercase">
 <Mail className="text-gold" size={24} />
 {type ==="live" ?"Mail Live" : type ==="die" ?"Mail Die" : type ==="monetized" ?"Mail Kiếm Tiền" :"Tổng Mail"}
 </h1>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">Tổng cộng: {(filteredMails || []).length}</p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 {/* Status Filter */}
 <div className="relative">
 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
 <select 
 value={selectedStatus}
 onChange={(e) => setSelectedStatus(e.target.value)}
 className="h-10 pl-9 pr-4 rounded-lg bg-sidebar border border-white/0 text-sm text-white focus:border-white/5 focus:outline-none appearance-none cursor-pointer transition-all"
 >
 <option value="all">Tất cả trạng thái</option>
 {(CHANNEL_STATUS_OPTIONS || []).map(status => (
 <option key={status} value={status}>{status}</option>
 ))}
 </select>
 </div>

 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
 <input 
 type="text"
 placeholder="Tìm kiếm nhanh..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="h-10 w-40 rounded-lg bg-sidebar border border-white/0 pl-10 pr-4 text-sm text-white focus:border-white/5 focus:outline-none transition-all"
 />
 </div>
 <button className="h-10 px-4 rounded-lg bg-gold text-[#0a0a0a] font-bold text-sm flex items-center gap-2 hover:bg-gold-hover transition-all">
 <Download size={16} /> Excel
 </button>
 </div>
 </div>

 {/* Grid Table Area */}
 <div className="flex-1 min-h-0 rounded-2xl border border-white/0 bg-sidebar flex flex-col shadow-2xl overflow-hidden">
 <div className="flex-1 overflow-auto custom-scrollbar">
 <table className="w-full text-left border-collapse min-w-[1200px]">
 <thead className="sticky top-0 z-20 bg-[#121212]">
 <tr className="bg-white/5 border-b border-white/0 shadow-sm">
 <th className="px-2 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 w-12 text-center whitespace-nowrap">STT</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 whitespace-nowrap">Email</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 whitespace-nowrap">Mật khẩu</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 whitespace-nowrap">Khôi phục</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 whitespace-nowrap">2FA</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 whitespace-nowrap">SĐT</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter border-r border-white/0 whitespace-nowrap">Trạng thái kênh</th>
 <th className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center whitespace-nowrap">Link</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border-custom">
 {(currentItems || []).map((mail, idx) => (
 <tr key={mail.id} className="hover:bg-zinc-800/50 bg-zinc-900/[0.03] transition-colors group animate-fade-in">
 <td className="px-2 py-2 text-[10px] font-bold border-r border-white/0 text-center whitespace-nowrap">
 {startIndex + idx + 1}
 </td>
 <td 
 onClick={() => copyToClipboard(mail.email)}
 className="px-3 py-2 border-r border-white/0 cursor-pointer active:bg-gold/10 overflow-hidden whitespace-nowrap animate-pulse-subtle"
 >
 <div className="flex items-center justify-between gap-1 overflow-hidden">
 <span className="text-white font-medium text-[11px] truncate transition-colors">{mail.email}</span>
 <span className={`text-[8px] px-1 py-0.5 rounded-md font-black flex-shrink-0 whitespace-nowrap ${getStatusColor(mail.status)}`}>
 {mail.status}
 </span>
 </div>
 </td>
 <td 
 onClick={() => copyToClipboard(mail.pass)}
 className="px-3 py-2 text-[11px] text-gray-400 font-mono border-r border-white/0 cursor-pointer active:bg-gold/10 hover:text-white truncate whitespace-nowrap"
 >
 {mail.pass}
 </td>
 <td 
 onClick={() => copyToClipboard(mail.recovery ||"")}
 className="px-3 py-2 text-[11px] text-gray-400 border-r border-white/0 cursor-pointer active:bg-gold/10 hover:text-white truncate whitespace-nowrap"
 >
 {mail.recovery}
 </td>
 <td 
 onClick={() => copyToClipboard(mail.twoFA ||"")}
 className="px-3 py-2 text-[11px] text-gray-400 font-mono border-r border-white/0 cursor-pointer active:bg-gold/10 hover:text-white truncate whitespace-nowrap"
 >
 {mail.twoFA}
 </td>
 <td 
 onClick={() => copyToClipboard(mail.phone ||"")}
 className="px-3 py-2 text-[11px] text-gray-400 border-r border-white/0 cursor-pointer active:bg-gold/10 hover:text-white truncate whitespace-nowrap"
 >
 {mail.phone}
 </td>
 <td className="px-3 py-2 border-r border-white/0 whitespace-nowrap">
 {mail.channelStatus && (
 <span className={`text-[9px] px-2 py-1 rounded-lg font-black border whitespace-nowrap ${getChannelStatusColor(mail.channelStatus)}`}>
 {mail.channelStatus}
 </span>
 )}
 </td>
 <td className="px-3 py-2 text-center whitespace-nowrap">
 <a 
 href={mail.otpLink} 
 target="_blank" 
 className="text-gold hover:text-white transition-colors flex justify-center whitespace-nowrap"
 >
 <ExternalLink size={14} />
 </a>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Compact Pagination */}
 <div className="px-6 py-3 border-t border-white/0 flex items-center justify-between bg-white/0 flex-shrink-0">
 <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tighter">
 Trang <span className="text-white">{currentPage}</span> / {totalPages}
 </p>
 <div className="flex items-center gap-2">
 <button 
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(p => p - 1)}
 className="p-1.5 rounded-lg bg-white/5 border border-white/0 text-white disabled:opacity-30 hover:bg-gold/20 transition-all"
 >
 <ChevronLeft size={16} />
 </button>
 <button 
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(p => p + 1)}
 className="p-1.5 rounded-lg bg-white/5 border border-white/0 text-white disabled:opacity-30 hover:bg-gold/20 transition-all"
 >
 <ChevronRight size={16} />
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

export default function MailManagementPage() {
 return (
 <Suspense fallback={<div className="text-white">Đang tải dữ liệu...</div>}>
 <MailTableContent />
 </Suspense>
 );
}
