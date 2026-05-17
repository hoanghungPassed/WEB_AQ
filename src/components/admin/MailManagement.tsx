"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  AlertTriangle,
  Database,
  Mail,
  RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { MOCK_MAILS, MailData } from "@/data/mockData";
import { useRouter } from "next/navigation";

const ConfigChannelModal = ({ mail, onClose, onSave }: { mail: any, onClose: () => void, onSave: (links: string[], names: string[]) => void }) => {
  const [links, setLinks] = useState<string[]>(mail.channelLinks || ["", "", ""]);
  const [names, setNames] = useState<string[]>(mail.channelNames || ["", "", ""]);
  const [scanning, setScanning] = useState<boolean[]>([false, false, false]);

  const handleLinkChange = (idx: number, val: string) => {
    const newLinks = [...links];
    newLinks[idx] = val;
    setLinks(newLinks);

    if (val.trim()) {
      const newScanning = [...scanning];
      newScanning[idx] = true;
      setScanning(newScanning);

      const newNames = [...names];
      newNames[idx] = "Đang quét thông tin kênh...";
      setNames(newNames);

      setTimeout(() => {
        const finalScanning = [...scanning];
        finalScanning[idx] = false;
        setScanning(finalScanning);

        const finalNames = [...names];
        const mockNames = [
          "AQ Vlogs Premium",
          "AQ Media Official",
          "Thế Giới Công Nghệ AQ",
          "Ẩm Thực Ba Miền",
          "Góc Thư Giãn Daily",
          "Kênh Chia Sẻ Kiến Thức"
        ];
        finalNames[idx] = `Kênh đã xác minh: ${mockNames[Math.floor(Math.random() * mockNames.length)]} (${Math.floor(Math.random() * 80 + 10)}k Sub)`;
        setNames(finalNames);
      }, 1200);
    } else {
      const newNames = [...names];
      newNames[idx] = "";
      setNames(newNames);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-sidebar border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg">
            <ExternalLink size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Cấu hình liên kết Kênh</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{mail?.email}</p>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          {[0, 1, 2].map(idx => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Link YouTube {idx + 1}</label>
                {names[idx] && (
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${scanning[idx] ? 'text-gray-400 animate-pulse' : 'text-gold'}`}>
                    {scanning[idx] && <RefreshCcw size={10} className="animate-spin text-gold" />}
                    {names[idx]}
                  </span>
                )}
              </div>
              <div className="relative group">
                <input 
                  value={links[idx]} 
                  onChange={(e) => handleLinkChange(idx, e.target.value)} 
                  placeholder="Dán link channel YouTube..." 
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all" 
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10 relative z-10">
          <button onClick={onClose} className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Đóng</button>
          <button 
            onClick={() => {
              onSave(links, names);
              onClose();
            }} 
            className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
          >
            Lưu cấu hình
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface MailManagementProps {
  type: "ROOT" | "SATELLITE" | "MONETIZED" | "ALL";
  user: any;
}

export default function MailManagement({ type, user }: MailManagementProps) {
  const router = useRouter();
  const [mails, setMails] = useState<MailData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Modals States
  const [showManualImport, setShowManualImport] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: "", msg: "", onConfirm: () => { } });
  const [selectedMailForConfig, setSelectedMailForConfig] = useState<any>(null);

  const [manualData, setManualData] = useState("");
  const itemsPerPage = 20;

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem("global_mails_data");
      if (saved) {
        setMails(JSON.parse(saved));
      } else {
        setMails(MOCK_MAILS);
        localStorage.setItem("global_mails_data", JSON.stringify(MOCK_MAILS));
      }
    };

    loadData();

    // Lắng nghe sự kiện storage để đồng bộ khi tab khác hoặc modal khác cập nhật
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const saveMails = (newMails: MailData[]) => {
    setMails(newMails);
    localStorage.setItem("global_mails_data", JSON.stringify(newMails));

    // Sync dashboard stats dynamically
    const stats = {
      totalMail: newMails.length,
      mailLive: newMails.filter(m => m.status === "LIVE").length,
      mailDie: newMails.filter(m => m.status === "DIE").length,
      mailMonetized: newMails.filter(m => m.type === "MONETIZED").length,
      staffOnline: 10,
      tasksToday: 4,
      mailWatchHours: 450
    };
    localStorage.setItem("dashboard_stats", JSON.stringify(stats));
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    triggerToast(`Đã sao chép ${label}`);
  };

  const handleWorkStatusChange = (mailId: number, newStatus: string) => {
    const updated = mails.map(m => {
      if (m.id === mailId) {
        let status = m.status;
        if (newStatus === "ĐÃ LÀM KÊNH") {
          status = "LIVE";
        } else if (newStatus === "LỖI") {
          status = "DIE";
        }
        return { ...m, workStatus: newStatus as any, status };
      }
      return m;
    });
    saveMails(updated);
    window.dispatchEvent(new Event("storage"));
    triggerToast("Đã cập nhật trạng thái công việc!");
  };

  const handleSaveChannels = (mailId: number, channelLinks: string[], channelNames: string[]) => {
    const updated = mails.map(m => {
      if (m.id === mailId) {
        return {
          ...m,
          channelLinks,
          channelNames,
          channelStatus: channelNames.filter(name => name && !name.includes("Đang quét")).join(", ") || m.channelStatus
        };
      }
      return m;
    });
    saveMails(updated);
    window.dispatchEvent(new Event("storage"));
    triggerToast("Đã cập nhật liên kết Kênh YouTube!");
  };

  const getStatusSelectStyle = (status: string) => {
    const val = status || "CHƯA LÀM";
    if (val === "CHƯA LÀM" || val === "CHƯA LÀM KÊNH" || val === "CHƯA MỜI MAIL") return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    if (val === "ĐÃ LÀM KÊNH" || val === "HOÀN THÀNH" || val === "ĐÃ LÀM" || val === "ĐÃ MỜI MAIL") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (val === "LỖI") return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  // Hàm mở Modal xác nhận xóa
  const deleteMail = (id: number) => {
    setConfirmConfig({
      title: "Xác nhận xóa",
      msg: "Bạn có chắc chắn muốn xóa mail này?",
      onConfirm: () => {
        setMails(prevMails => {
          const finalMails = prevMails.filter(m => m.id !== id);
          localStorage.setItem("global_mails_data", JSON.stringify(finalMails));

          // Cập nhật thống kê đồng bộ cho Dashboard
          const stats = {
            totalMail: finalMails.length,
            mailLive: finalMails.filter(m => m.status === "LIVE").length,
            mailDie: finalMails.filter(m => m.status === "DIE").length,
            mailMonetized: finalMails.filter(m => m.type === "MONETIZED").length,
            mailWatchHours: 120,
            staffOnline: 12,
            tasksToday: 25
          };
          localStorage.setItem("dashboard_stats", JSON.stringify(stats));

          return finalMails;
        });
        setShowConfirm(false);
        triggerToast("Đã xóa mail thành công!");
      }
    });
    setShowConfirm(true);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const importedMails: MailData[] = data.map((item: any, i: number) => ({
          id: Date.now() + i,
          email: String(item.Email || item.email || "").trim(),
          pass: String(item.Password || item.pass || item.Pass || "").trim(),
          recovery: String(item.Recovery || item.recovery || item["Mail KP"] || "").trim(),
          twoFA: String(item["2FA"] || item.twoFA || "").trim(),
          phone: String(item["SĐT"] || item.phone || "").trim(),
          otpLink: String(item["Link SĐT"] || item.otpLink || "").trim(),
          type: (type === "ALL" ? "SATELLITE" : type) as "ROOT" | "SATELLITE" | "MONETIZED",
          status: "LIVE" as const,
          workStatus: "CHƯA LÀM" as const,
          createdAt: new Date().toISOString().split("T")[0]
        } as MailData)).filter(m => m.email); // Chỉ lấy những dòng có email

        if (importedMails.length === 0) {
          triggerToast("Không tìm thấy dữ liệu mail hợp lệ!");
          return;
        }

        setMails(prevMails => {
          const filteredExisting = prevMails.filter(m => !importedMails.some(i => i.email === m.email));
          const finalMails = [...importedMails, ...filteredExisting];
          localStorage.setItem("global_mails_data", JSON.stringify(finalMails));

          // Sync dashboard
          const stats = {
            totalMail: finalMails.length,
            mailLive: finalMails.filter(m => m.status === "LIVE").length,
            mailDie: finalMails.filter(m => m.status === "DIE").length,
            mailMonetized: finalMails.filter(m => m.type === "MONETIZED").length,
            mailWatchHours: 120,
            staffOnline: 12,
            tasksToday: 25
          };
          localStorage.setItem("dashboard_stats", JSON.stringify(stats));

          return finalMails;
        });

        triggerToast(`Import thành công ${importedMails.length} mail!`);
      } catch (err) {
        console.error("Import Error:", err);
        triggerToast("Lỗi xử lý dữ liệu file Excel!");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleManualImport = () => {
    if (!manualData.trim()) return;
    const lines = manualData.split("\n");
    const newItems: MailData[] = lines.filter(l => l.trim()).map((line, i) => {
      const parts = line.split(/[\t|]|\s{2,}/);
      return {
        id: Date.now() + i,
        email: String(parts[0] || "").trim(),
        pass: String(parts[1] || "").trim(),
        recovery: String(parts[2] || "").trim(),
        twoFA: String(parts[3] || "").trim(),
        phone: String(parts[4] || "").trim(),
        otpLink: String(parts[5] || "").trim(),
        type: (type === "ALL" ? "SATELLITE" : type) as "ROOT" | "SATELLITE" | "MONETIZED",
        status: "LIVE" as const,
        workStatus: "CHƯA LÀM" as const,
        createdAt: new Date().toISOString().split("T")[0]
      } as MailData;
    }).filter(m => m.email);

    if (newItems.length === 0) {
      triggerToast("Không có dữ liệu hợp lệ!");
      return;
    }

    setMails(prevMails => {
      const filteredExisting = prevMails.filter(m => !newItems.some(ni => ni.email === m.email));
      const finalMails = [...newItems, ...filteredExisting];
      localStorage.setItem("global_mails_data", JSON.stringify(finalMails));

      // Sync dashboard
      const stats = {
        totalMail: finalMails.length,
        mailLive: finalMails.filter(m => m.status === "LIVE").length,
        mailDie: finalMails.filter(m => m.status === "DIE").length,
        mailMonetized: finalMails.filter(m => m.type === "MONETIZED").length,
        mailWatchHours: 120,
        staffOnline: 12,
        tasksToday: 25
      };
      localStorage.setItem("dashboard_stats", JSON.stringify(stats));

      return finalMails;
    });

    setManualData("");
    setShowManualImport(false);
    triggerToast(`Thêm thành công ${newItems.length} mail!`);
  };

  const handleExport = () => {
    const data = filteredMails.map((m, i) => ({
      "STT": i + 1, "Email": m.email, "Mail KP": m.recovery, "Pass": m.pass, "2FA": m.twoFA, "SĐT": m.phone, "Link SĐT": m.otpLink
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach");
    XLSX.writeFile(wb, `AQ_MEDIA_${type}.xlsx`);
    triggerToast("Đã xuất Excel thành công!");
  };

  const filteredMails = useMemo(() => {
    const isStaff = user?.role === "04";
    // Lấy toàn bộ mail của loại này để tính STT gốc
    const mailsOfType = mails.filter(m => type === "ALL" || m.type === type);
    
    return mailsOfType
      .map((m, idx) => ({ ...m, originalSTT: idx + 1 })) // Gắn STT gốc
      .filter(m => {
        if (isStaff) {
          // Nhân viên chỉ xem mail được giao cho mình
          if (String(m.assigneeId) !== String(user?.id)) return false;
        } else {
          // Admin/QL CV chỉ xem những mail chưa giao
          if (m.assigneeId) return false;
        }

        const matchesSearch = m.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.recovery.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesStatus = true;
        if (statusFilter !== "ALL") {
          const val = (m.workStatus || "CHƯA LÀM") as string;
          if (statusFilter === "CHƯA LÀM KÊNH") {
            matchesStatus = val === "CHƯA LÀM" || val === "CHƯA LÀM KÊNH";
          } else if (statusFilter === "ĐÃ LÀM KÊNH") {
            matchesStatus = val === "ĐÃ LÀM KÊNH" || val === "HOÀN THÀNH" || val === "ĐÃ LÀM";
          } else {
            matchesStatus = val === statusFilter;
          }
        }
        return matchesSearch && matchesStatus;
      });
  }, [mails, type, searchTerm, user, statusFilter]);

  const staffStats = useMemo(() => {
    const myMails = mails.filter(m => String(m.assigneeId) === String(user?.id) && m.type === "SATELLITE");
    return {
      totalAssigned: myMails.length,
      doneChannel: myMails.filter(m => (m.workStatus as string) === "ĐÃ LÀM KÊNH" || (m.workStatus as string) === "HOÀN THÀNH" || (m.workStatus as string) === "ĐÃ LÀM").length,
      invitedMail: myMails.filter(m => (m.workStatus as string) === "ĐÃ MỜI MAIL").length,
      failed: myMails.filter(m => (m.workStatus as string) === "LỖI").length,
    };
  }, [mails, user]);

  const totalPages = Math.ceil(filteredMails.length / itemsPerPage);
  const currentItems = filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC" || user?.role === "01" || user?.role === "02";

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-2 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Confirm Modal - Đồng nhất 1 Form */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-sidebar border border-white/10 rounded-[40px] p-10 w-full max-w-md shadow-2xl text-center">
              <div className="mx-auto h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{confirmConfig.title}</h3>
              <p className="text-gray-400 font-medium mb-8 leading-relaxed">{confirmConfig.msg}</p>
              <div className="flex gap-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 h-12 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all">Hủy bỏ</button>
                <button onClick={confirmConfig.onConfirm} className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Xác nhận Xóa</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Import Modal - Cùng form với Confirm Modal */}
      <AnimatePresence>
        {showManualImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-sidebar border border-white/10 rounded-[40px] p-10 w-full max-w-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><PlusCircle className="text-gold" size={32} /> Import Thủ Công</h3>
                <button onClick={() => setShowManualImport(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-white transition-colors"><X /></button>
              </div>
              <p className="text-[10px] text-gray-500 mb-6 font-black uppercase tracking-widest leading-relaxed opacity-60">
                Định dạng: Email [Tab/Cách] Pass [Tab/Cách] Mail KP [Tab/Cách] 2FA [Tab/Cách] SĐT [Tab/Cách] Link OTP
              </p>
              <textarea
                value={manualData} onChange={(e) => setManualData(e.target.value)}
                className="w-full h-72 bg-black/30 border border-white/10 rounded-3xl p-6 text-sm text-white focus:border-gold outline-none transition-all resize-none font-mono scrollbar-hide"
                placeholder="Dán dữ liệu của bạn vào đây..."
              />
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowManualImport(false)} className="flex-1 h-14 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all">Hủy bỏ</button>
                <button onClick={handleManualImport} className="flex-1 h-14 rounded-2xl bg-gold text-sidebar font-black uppercase text-xs tracking-widest hover:bg-gold/80 transition-all shadow-xl shadow-gold/20">Xác nhận Thêm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      {/* Main UI Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-gold hover:text-white font-black uppercase text-xs tracking-widest transition-all group">
            <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-all shadow-lg"><ArrowLeft size={20} /></div>
            Quay lại bảng điều khiển
          </button>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Mail className="text-gold" size={28} />
            Danh sách {type === "ALL" ? "Tất cả" : type === "ROOT" ? "Mail Gốc" : type === "SATELLITE" ? "Mail Vệ Tinh" : "Mail Bật Kiếm Tiền"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Nút reset để phục vụ testing - Luôn hiển thị */}
          <button 
            onClick={() => {
              if (confirm("Xác nhận khôi phục toàn bộ dữ liệu về trạng thái ban đầu?")) {
                localStorage.removeItem("global_mails_data");
                localStorage.removeItem("global_tasks_data");
                localStorage.removeItem("dashboard_stats");
                window.location.reload();
              }
            }}
            className="h-10 px-4 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <RefreshCcw size={14} /> Khôi phục dữ liệu gốc
          </button>
          {isAdminOrManager && (
            <>
              <button onClick={() => setShowManualImport(true)} className="h-10 px-4 bg-white/5 border border-white/10 hover:border-gold/50 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><PlusCircle size={14} className="text-gold" /> Thêm thủ công</button>
              <label className="h-10 px-4 bg-white/5 border border-white/10 hover:border-gold/50 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"><Upload size={14} className="text-gold" /> Import Excel <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} /></label>
              <button onClick={handleExport} className="h-10 px-4 bg-gold/10 border border-gold/30 hover:bg-gold/20 rounded-xl text-gold text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Download size={14} /> Export</button>
            </>
          )}
        </div>
      </div>

      {/* Thẻ thống kê hiệu suất cá nhân của Nhân viên (Role 04) */}
      {user?.role === "04" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-sidebar border border-border-custom p-6 rounded-[24px] flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tổng mail được giao</p>
              <h3 className="text-2xl font-black text-white">{staffStats.totalAssigned}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20"><Mail size={24} /></div>
          </div>
          <div className="bg-sidebar border border-border-custom p-6 rounded-[24px] flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Đã làm kênh</p>
              <h3 className="text-2xl font-black text-green-500">{staffStats.doneChannel}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20"><CheckCircle size={24} /></div>
          </div>
          <div className="bg-sidebar border border-border-custom p-6 rounded-[24px] flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Đã mời mail</p>
              <h3 className="text-2xl font-black text-blue-400">{staffStats.invitedMail}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20"><CheckCircle size={24} /></div>
          </div>
          <div className="bg-sidebar border border-border-custom p-6 rounded-[24px] flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Lỗi (Die)</p>
              <h3 className="text-2xl font-black text-red-500">{staffStats.failed}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20"><AlertTriangle size={24} /></div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Dữ liệu chi tiết</h3>
            <div className="h-8 w-px bg-white/10 hidden md:block" />
            <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 h-10 w-full md:w-80 focus-within:border-gold transition-all">
              <Search size={16} className="text-gray-500" />
              <input type="text" placeholder="Tìm kiếm Email hoặc Mail KP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white w-full" />
            </div>
            {user?.role === "04" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
              >
                <option value="ALL" className="bg-sidebar text-white">Tất cả trạng thái</option>
                <option value="CHƯA LÀM KÊNH" className="bg-sidebar text-white">Chưa làm kênh</option>
                <option value="ĐÃ LÀM KÊNH" className="bg-sidebar text-white">Đã làm kênh</option>
                <option value="CHƯA MỜI MAIL" className="bg-sidebar text-white">Chưa mời mail</option>
                <option value="ĐÃ MỜI MAIL" className="bg-sidebar text-white">Đã mời mail</option>
                <option value="LỖI" className="bg-sidebar text-white">Lỗi (Die)</option>
              </select>
            )}
            <div className="hidden md:flex items-center gap-3 px-5 py-2 bg-gold/10 border-2 border-gold/20 rounded-2xl shadow-lg shadow-gold/5 group">
              <Mail size={18} className="text-gold animate-pulse" />
              <span className="text-sm font-black text-white uppercase tracking-widest">
                Tổng cộng: <span className="text-gold text-base ml-1">{filteredMails.length}</span> <span className="text-gold/60 text-[10px] ml-1">Mail</span>
              </span>
            </div>
          </div>
          <button onClick={() => router.push("/admin")} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-all"><X size={20} /></button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
              <tr>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Email</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Mail KP</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Pass</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">2FA</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">SĐT</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Link SĐT</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Trạng thái</th>
                {user?.role === "04" && (
                  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Cấu hình</th>
                )}
                {(user?.role === "01" || user?.role === "02") && (
                  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Xóa</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {currentItems.length > 0 ? currentItems.map((mail: any, index) => (
                <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-5 px-6 text-[10px] font-black text-gray-500">{mail.originalSTT}</td>
                  <td className="py-5 px-6 cursor-pointer hover:text-gold transition-colors font-bold" onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                  <td className="py-5 px-6 cursor-pointer text-xs text-gray-400 hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.recovery, "Mail KP")}>{mail.recovery}</td>
                  <td className="py-5 px-6 cursor-pointer text-xs text-gray-500 hover:text-gold transition-colors font-mono" onClick={() => copyToClipboard(mail.pass, "Mật khẩu")}>{mail.pass}</td>
                  <td className="py-5 px-6 cursor-pointer text-xs text-gray-500 hover:text-gold transition-colors font-mono" onClick={() => copyToClipboard(mail.twoFA || "", "2FA")}>{mail.twoFA || "---"}</td>
                  <td className="py-5 px-6 cursor-pointer text-xs text-gray-500 hover:text-gold transition-colors font-bold" onClick={() => copyToClipboard(mail.phone || "", "SĐT")}>{mail.phone || "---"}</td>
                  <td className="py-5 px-6">
                    {mail.otpLink ? <a href={mail.otpLink} target="_blank" className="text-blue-400 hover:text-white transition-all flex items-center gap-1 font-bold text-xs">Link OTP <ExternalLink size={12} /></a> : <span className="text-gray-700">---</span>}
                  </td>
                  <td className="py-5 px-6 text-center">
                    <select
                      value={mail.workStatus || "CHƯA LÀM"}
                      onChange={(e) => handleWorkStatusChange(mail.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus)}`}
                    >
                      <option value="CHƯA LÀM" className="bg-sidebar text-white">Chưa làm kênh</option>
                      <option value="ĐÃ LÀM KÊNH" className="bg-sidebar text-white">Đã làm kênh</option>
                      <option value="CHƯA MỜI MAIL" className="bg-sidebar text-white">Chưa mời mail</option>
                      <option value="ĐÃ MỜI MAIL" className="bg-sidebar text-white">Đã mời mail</option>
                      <option value="LỖI" className="bg-sidebar text-white">Lỗi (Die)</option>
                    </select>
                  </td>
                  {user?.role === "04" && (
                    <td className="py-5 px-6 text-center">
                      <button 
                        onClick={() => {
                          setSelectedMailForConfig(mail);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-gold/10 hover:bg-gold hover:text-sidebar text-gold border border-gold/30 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold/5"
                      >
                        Thêm Link Kênh
                      </button>
                    </td>
                  )}
                  {(user?.role === "01" || user?.role === "02") && (
                    <td className="py-5 px-6 text-center">
                      <button onClick={() => deleteMail(mail.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-inner"><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={user?.role === "04" ? 9 : (user?.role === "01" || user?.role === "02") ? 9 : 8} className="py-20 text-center text-gray-600 font-bold uppercase tracking-widest">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Trang <span className="text-white font-black">{currentPage}</span> / {totalPages || 1}</span>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronLeft size={18} /></button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* YouTube Channel Config Modal */}
      <AnimatePresence>
        {selectedMailForConfig && (
          <ConfigChannelModal
            mail={selectedMailForConfig}
            onClose={() => setSelectedMailForConfig(null)}
            onSave={(links, names) => handleSaveChannels(selectedMailForConfig.id, links, names)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
