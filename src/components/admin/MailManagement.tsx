"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Download, 
  Upload, 
  Filter,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { MOCK_MAILS, MailData } from "@/data/mockData";

interface MailManagementProps {
  type: "ROOT" | "SATELLITE" | "MONETIZED" | "ALL";
  user: any;
}

export default function MailManagement({ type, user }: MailManagementProps) {
  const [mails, setMails] = useState<MailData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedText, setCopiedText] = useState("");
  const itemsPerPage = 50;

  useEffect(() => {
    // Load từ localStorage hoặc dùng mock
    const saved = localStorage.getItem("global_mails_data");
    if (saved) {
      setMails(JSON.parse(saved));
    } else {
      setMails(MOCK_MAILS);
    }
  }, []);

  const saveMails = (newMails: MailData[]) => {
    setMails(newMails);
    localStorage.setItem("global_mails_data", JSON.stringify(newMails));
    // Cập nhật thống kê dashboard
    const stats = {
      totalMail: newMails.length,
      mailLive: newMails.filter(m => m.status === "LIVE").length,
      mailDie: newMails.filter(m => m.status === "DIE").length,
      mailMonetized: newMails.filter(m => m.type === "MONETIZED").length,
      mailWatchHours: 120, // Giữ nguyên hoặc tính toán thêm
      staffOnline: 12,
      tasksToday: 25
    };
    localStorage.setItem("dashboard_stats", JSON.stringify(stats));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Chuyển đổi data từ excel sang format hệ thống
      const newMails: MailData[] = data.map((item: any, index: number) => ({
        id: Date.now() + index,
        email: item.Email || item.email || "",
        pass: item.Password || item.pass || "",
        recovery: item.Recovery || item.recovery || "",
        type: type === "ALL" ? "SATELLITE" : type,
        status: "LIVE",
        workStatus: "CHƯA LÀM",
        createdAt: new Date().toISOString().split("T")[0]
      }));

      saveMails([...newMails, ...mails]);
      alert(`Đã import thành công ${newMails.length} mail!`);
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(mails.filter(m => type === "ALL" || m.type === type));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mails");
    XLSX.writeFile(wb, `AQ_MEDIA_MAILS_${type}_${new Date().toISOString()}.xlsx`);
  };

  const updateWorkStatus = (id: number, status: "CHƯA LÀM" | "ĐANG LÀM" | "HOÀN THÀNH") => {
    const newMails = mails.map(m => m.id === id ? { ...m, workStatus: status } : m);
    saveMails(newMails);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const filteredMails = mails.filter(m => {
    const matchesType = type === "ALL" || m.type === type;
    const matchesSearch = m.email.toLowerCase().includes(searchTerm.toLowerCase());
    // Nếu là nhân viên, chỉ thấy mail được giao cho mình (Giả lập)
    const matchesAssignment = user?.role !== "NHÂN VIÊN" || m.assignedTo === user?.name || !m.assignedTo;
    return matchesType && matchesSearch && matchesAssignment;
  });

  const totalPages = Math.ceil(filteredMails.length / itemsPerPage);
  const currentItems = filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC";

  return (
    <div className="flex flex-col space-y-6 h-full">
      <AnimatePresence>
        {copiedText && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-gold px-6 py-2 rounded-full text-sidebar font-black text-sm shadow-2xl"
          >
            Đã sao chép: {copiedText}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
            <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
              <Download size={24} />
            </div>
            {type === "ROOT" ? "Mail Gốc" : type === "SATELLITE" ? "Mail Vệ Tinh" : type === "MONETIZED" ? "Mail Bật Kiếm Tiền" : "Quản lý Mail"}
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Tổng cộng: {filteredMails.length} mail</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-64 bg-sidebar border border-border-custom rounded-xl pl-10 pr-4 text-sm text-white focus:border-gold/50 outline-none transition-all"
            />
          </div>

          {isAdminOrManager && (
            <>
              <label className="h-11 px-5 bg-white/5 border border-white/10 hover:border-gold/50 rounded-xl flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest cursor-pointer transition-all">
                <Upload size={16} className="text-gold" />
                Import Excel
                <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
              </label>
              <button 
                onClick={handleExport}
                className="h-11 px-5 bg-gold text-sidebar rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gold/80 transition-all shadow-lg shadow-gold/10"
              >
                <Download size={16} /> Export
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 bg-sidebar border border-border-custom rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest w-16 text-center">STT</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Mật khẩu</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái</th>
                {type === "SATELLITE" && <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Công việc</th>}
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Giao cho</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentItems.map((mail, index) => (
                <tr key={mail.id} className="hover:bg-white/[0.02] transition-all group">
                  <td className="px-6 py-4 text-xs font-bold text-gray-600 text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="px-6 py-4" onClick={() => copyToClipboard(mail.email)}>
                    <div className="flex flex-col cursor-pointer">
                      <span className="text-sm font-bold text-white group-hover:text-gold transition-colors">{mail.email}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Khôi phục: {mail.recovery}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400" onClick={() => copyToClipboard(mail.pass)}>
                    <span className="cursor-pointer hover:text-white transition-colors">{mail.pass}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${mail.status === "LIVE" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                      {mail.status}
                    </span>
                  </td>
                  {type === "SATELLITE" && (
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          if (user?.role === "NHÂN VIÊN" || isAdminOrManager) {
                            const nextStatus = mail.workStatus === "CHƯA LÀM" ? "ĐANG LÀM" : mail.workStatus === "ĐANG LÀM" ? "HOÀN THÀNH" : "CHƯA LÀM";
                            updateWorkStatus(mail.id, nextStatus as any);
                          }
                        }}
                        className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all ${
                          mail.workStatus === "CHƯA LÀM" ? "bg-white/5 border-white/10 text-gray-400" :
                          mail.workStatus === "ĐANG LÀM" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                          "bg-green-500/10 border-green-500/20 text-green-500"
                        }`}
                      >
                        {mail.workStatus === "CHƯA LÀM" && <Clock size={12} />}
                        {mail.workStatus === "ĐANG LÀM" && <AlertCircle size={12} className="animate-pulse" />}
                        {mail.workStatus === "HOÀN THÀNH" && <CheckCircle2 size={12} />}
                        {mail.workStatus}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {mail.assignedTo ? mail.assignedTo.charAt(0) : <UserPlus size={12} />}
                      </div>
                      <span className="text-xs font-bold text-gray-400">{mail.assignedTo || "Chưa giao"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-gold/20 text-gray-400 hover:text-gold transition-all">
                      <Filter size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
          <p className="text-xs font-bold text-gray-500">Trang {currentPage} / {totalPages}</p>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
