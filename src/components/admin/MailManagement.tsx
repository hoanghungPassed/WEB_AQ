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

const UnifiedMailDetailModal = ({
  mail,
  type,
  user,
  onClose,
  onSave
}: {
  mail: any;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  user: any;
  onClose: () => void;
  onSave: (updatedFields: any) => void;
}) => {
  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager = roleUpper === "01" || 
                           roleUpper === "ADMIN" || 
                           roleUpper === "02" || 
                           roleUpper === "QL CÔNG VIỆC" || 
                           roleUpper === "QUẢN LÝ CÔNG VIỆC";

  // State for ROOT
  const [cccdDate, setCccdDate] = useState(mail.cccdDate || "");
  const [verificationStatus, setVerificationStatus] = useState(mail.verificationStatus || "Chưa xanh");

  // State for SATELLITE
  const [links, setLinks] = useState<string[]>(mail.links || ["", "", ""]);
  const [names, setNames] = useState<string[]>(mail.channelNames || ["", "", ""]);
  const [scanning, setScanning] = useState<boolean[]>([false, false, false]);
  const [eligibleChannels, setEligibleChannels] = useState<boolean[]>(mail.eligibleChannels || [false, false, false]);

  // State for MONETIZED
  const [reClickDate, setReClickDate] = useState(mail.reClickDate || "");
  const [step2PendingDate, setStep2PendingDate] = useState(mail.step2PendingDate || "");
  const [channelStatusDetail, setChannelStatusDetail] = useState(mail.channelStatusDetail || "Chưa Done");

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
        finalNames[idx] = `Tên kênh: ${mockNames[Math.floor(Math.random() * mockNames.length)]}`;
        setNames(finalNames);
      }, 800);
    } else {
      const newNames = [...names];
      newNames[idx] = "";
      setNames(newNames);
    }
  };

  const handleSave = () => {
    if (type === "ROOT") {
      onSave({ cccdDate, verificationStatus });
    } else if (type === "SATELLITE") {
      onSave({
        links,
        channelNames: names,
        eligibleChannels
      });
    } else if (type === "MONETIZED") {
      onSave({
        reClickDate,
        step2PendingDate,
        channelStatusDetail
      });
    }
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-sidebar border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg font-black">
              {type === "ROOT" ? <Database size={28} /> : type === "SATELLITE" ? <ExternalLink size={28} /> : <Mail size={28} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {type === "ROOT" ? "Chi tiết Mail Gốc" : type === "SATELLITE" ? "Chi tiết Mail Vệ Tinh" : "Cấu hình Kiếm Tiền"}
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{mail?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-all"><X size={20} /></button>
        </div>

        <div className="space-y-6 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {type === "ROOT" && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quét lại CCCD vào ngày</label>
                <input
                  type="date"
                  value={cccdDate}
                  onChange={(e) => setCccdDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tình trạng xác minh</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                >
                  <option value="Mail Veri mail" className="bg-sidebar text-white">Mail Veri mail</option>
                  <option value="Đã xanh" className="bg-sidebar text-white">Đã xanh</option>
                  <option value="Chưa xanh" className="bg-sidebar text-white">Chưa xanh</option>
                </select>
              </div>
            </>
          )}

          {type === "SATELLITE" && (
            <>
              {[0, 1, 2].map(idx => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Link YouTube {idx + 1}</label>
                    {names[idx] && (
                      <span className="text-[10px] font-black uppercase text-gold">
                        {names[idx]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      value={links[idx] || ""}
                      onChange={(e) => handleLinkChange(idx, e.target.value)}
                      placeholder="Dán link channel YouTube..."
                      className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all"
                    />
                    {isAdminOrManager && (
                      <button
                        onClick={() => {
                          const newEligible = [...eligibleChannels];
                          newEligible[idx] = !newEligible[idx];
                          setEligibleChannels(newEligible);
                        }}
                        className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-shrink-0 ${eligibleChannels[idx]
                            ? "bg-gold text-sidebar border-gold shadow-lg shadow-gold/20"
                            : "bg-white/5 text-gray-400 border-white/10 hover:border-gold/30 hover:text-gold"
                          }`}
                      >
                        <CheckCircle size={16} />
                        {eligibleChannels[idx] ? "Đủ giờ" : "Đánh dấu"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {type === "MONETIZED" && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ngày bấm lại</label>
                <input
                  type="date"
                  value={reClickDate}
                  onChange={(e) => setReClickDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chờ bước 2</label>
                <input
                  type="date"
                  value={step2PendingDate}
                  onChange={(e) => setStep2PendingDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Trạng thái chi tiết</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Chờ bước 3", "Mất kênh", "Chưa SUB", "DONE", "Gắn lại gà", "Die Spam", "Chưa Done"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setChannelStatusDetail(status)}
                      className={`h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${channelStatusDetail === status
                          ? "bg-gold/20 text-gold border-gold/45 shadow-lg shadow-gold/5"
                          : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 relative z-10 pt-4 border-t border-white/5">
          <button onClick={onClose} className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Đóng</button>
          <button
            onClick={handleSave}
            className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
          >
            Lưu cập nhật
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
  const [dateFilter, setDateFilter] = useState<"ALL" | "1_MONTH" | "2_MONTH">("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
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

  const roleUpper = String(user?.role || "").toUpperCase();
  const isStaff = roleUpper === "04" || 
                  roleUpper === "NHÂN VIÊN" || 
                  roleUpper === "03" || 
                  roleUpper === "QL NHÂN SỰ" || 
                  roleUpper === "QUẢN LÝ NHÂN SỰ";
  const isAdminOrManager = roleUpper === "01" || 
                           roleUpper === "ADMIN" || 
                           roleUpper === "02" || 
                           roleUpper === "QL CÔNG VIỆC" || 
                           roleUpper === "QUẢN LÝ CÔNG VIỆC";

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
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const saveMails = async (newMails: MailData[]) => {
    setMails(newMails);
    localStorage.setItem("global_mails_data", JSON.stringify(newMails));
    window.dispatchEvent(new Event("storage"));

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_mails_data: JSON.stringify(newMails)
        })
      });
    } catch (err) {
      console.error("Sync error:", err);
    }
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
        if (newStatus === "Đã làm" || newStatus === "Đã bán" || newStatus === "Chưa làm") {
          status = "LIVE";
        } else if (newStatus === "Lỗi") {
          status = "DIE";
        }
        return {
          ...m,
          workStatus: newStatus as any,
          status,
          updatedBy: user?.name || user?.id || m.updatedBy
        };
      }
      return m;
    });
    saveMails(updated);
    triggerToast("Đã cập nhật trạng thái công việc!");
  };

  const handleSaveUnifiedDetails = (mailId: number, updatedFields: any) => {
    const updated = mails.map(m => {
      if (m.id === mailId) {
        return {
          ...m,
          ...updatedFields,
          updatedBy: user?.name || user?.id || m.updatedBy
        };
      }
      return m;
    });
    saveMails(updated);
    triggerToast("Đã cập nhật chi tiết thành công!");
  };

  const getStatusSelectStyle = (status: string) => {
    const val = (status || "Chưa làm").toLowerCase();
    if (val === "đã làm" || val === "đã bán") {
      return "bg-green-500/10 text-green-500 border-green-500/20";
    }
    if (val === "lỗi") {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  const deleteMail = (id: number) => {
    setConfirmConfig({
      title: "Xác nhận xóa",
      msg: "Bạn có chắc chắn muốn xóa mail này?",
      onConfirm: () => {
        const finalMails = mails.filter(m => m.id !== id);
        saveMails(finalMails);
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
          workStatus: (type === "MONETIZED" ? "Chưa bán" : "Chưa làm") as any,
          createdAt: new Date().toISOString().split("T")[0]
        } as MailData)).filter(m => m.email);

        if (importedMails.length === 0) {
          triggerToast("Không tìm thấy dữ liệu mail hợp lệ!");
          return;
        }

        const filteredExisting = mails.filter(m => !importedMails.some(i => i.email === m.email));
        saveMails([...importedMails, ...filteredExisting]);
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
        workStatus: (type === "MONETIZED" ? "Chưa bán" : "Chưa làm") as any,
        createdAt: new Date().toISOString().split("T")[0]
      } as MailData;
    }).filter(m => m.email);

    if (newItems.length === 0) {
      triggerToast("Không có dữ liệu hợp lệ!");
      return;
    }

    const filteredExisting = mails.filter(m => !newItems.some(ni => ni.email === m.email));
    saveMails([...newItems, ...filteredExisting]);
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
    const mailsOfType = mails.filter(m => type === "ALL" || m.type === type);

    return mailsOfType
      .map((m: any) => ({ 
        ...m, 
        // Với mail vệ tinh: dùng satelliteIndex (1-500) làm STT gốc hiển thị cho nhân viên
        // Với mail khác: dùng m.id
        originalSTT: m.type === "SATELLITE" && m.satelliteIndex ? m.satelliteIndex : m.id 
      }))
      .filter(m => {
        if (isStaff && type === "SATELLITE") {
          if (String(m.assigneeId) !== String(user?.id)) return false;
          if (selectedBatch && m.batchName !== selectedBatch) return false;
        }

        const matchesSearch = m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.recovery.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (statusFilter !== "ALL") {
          const val = m.workStatus || (type === "MONETIZED" ? "Chưa bán" : "Chưa làm");
          matchesStatus = String(val).toLowerCase() === statusFilter.toLowerCase();
        }

        let matchesDate = true;
        if (isAdminOrManager && type === "ROOT" && dateFilter !== "ALL") {
          const doneDateVal = (m as any).cccdDate;
          if (!doneDateVal) {
            matchesDate = false;
          } else {
            try {
              const today = new Date("2026-05-17");
              const done = new Date(doneDateVal);
              const diffTime = Math.abs(today.getTime() - done.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const limit = dateFilter === "1_MONTH" ? 30 : 60;
              if (diffDays > limit) matchesDate = false;
            } catch (e) {
              matchesDate = false;
            }
          }
        }

        let matchesAssignment = true;
        if (isAdminOrManager && type === "SATELLITE" && assignmentFilter !== "ALL") {
          if (assignmentFilter === "ASSIGNED") {
            matchesAssignment = !!m.assigneeId;
          } else if (assignmentFilter === "UNASSIGNED") {
            matchesAssignment = !m.assigneeId;
          }
        }

        return matchesSearch && matchesStatus && matchesDate && matchesAssignment;
      });
  }, [mails, type, searchTerm, user, statusFilter, dateFilter, assignmentFilter, selectedBatch, isStaff, isAdminOrManager]);

  const staffStats = useMemo(() => {
    const myMails = mails.filter(m => String(m.assigneeId) === String(user?.id) && m.type === "SATELLITE");
    return {
      totalAssigned: myMails.length,
      doneChannel: myMails.filter(m => (m.workStatus as string) === "Đã làm").length,
      failed: myMails.filter(m => (m.workStatus as string) === "Lỗi").length,
    };
  }, [mails, user]);

  const totalPages = isStaff && type === "SATELLITE" ? 1 : Math.ceil(filteredMails.length / itemsPerPage);
  const currentItems = isStaff && type === "SATELLITE" ? filteredMails : filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const staffBatches = useMemo(() => {
    if (!isStaff || type !== "SATELLITE") return [];
    const mySats = mails.filter(m => String(m.assigneeId) === String(user?.id) && m.type === "SATELLITE");
    const counts: Record<string, number> = {};
    mySats.forEach(m => {
      const b = m.batchName || "Lô chưa phân loại";
      counts[b] = (counts[b] || 0) + 1;
    });
    ["Lô 1", "Lô 2", "Lô 3", "Lô 4", "Lô 5", "Lô 6"].forEach(b => {
      if (counts[b] === undefined) counts[b] = 0;
    });
    return Object.entries(counts).sort((a, b) => {
      const numA = parseInt(a[0].replace(/\D/g, "")) || 999;
      const numB = parseInt(b[0].replace(/\D/g, "")) || 999;
      return numA - numB;
    });
  }, [mails, user, isStaff, type]);

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-2 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

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
      </AnimatePresence>

      {(!isStaff || !selectedBatch) && (
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
            <button
              onClick={async () => {
                if (confirm("Xác nhận khôi phục toàn bộ dữ liệu về trạng thái ban đầu?")) {
                  try {
                    const { MOCK_STAFF, MOCK_MAILS, MOCK_TASK_ASSIGNMENTS, MOCK_KPI_DATA } = await import("@/data/mockData");

                    const resetPayload = {
                      global_users: JSON.stringify(MOCK_STAFF),
                      global_mails_data: JSON.stringify(MOCK_MAILS),
                      global_tasks_data: JSON.stringify(MOCK_TASK_ASSIGNMENTS),
                      global_kpi_data: JSON.stringify(MOCK_KPI_DATA),
                      admin_notifications: JSON.stringify([]),
                      realtime_toast: JSON.stringify({ userId: "all", message: "Hệ thống đã được khôi phục dữ liệu gốc!" }),
                      pending_access_requests: JSON.stringify([])
                    };

                    Object.entries(resetPayload).forEach(([k, v]) => {
                      localStorage.setItem(k, v);
                    });

                    await fetch("/api/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(resetPayload)
                    });

                    window.dispatchEvent(new Event("storage"));
                    alert("Khôi phục dữ liệu gốc thành công! Toàn bộ hệ thống đã được đồng bộ lại.");
                    window.location.reload();
                  } catch (err) {
                    console.error("Reset error:", err);
                    alert("Đã xảy ra lỗi khi khôi phục dữ liệu.");
                  }
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
      )}

      {isStaff && !selectedBatch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-sidebar border border-border-custom p-6 rounded-[24px] flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tổng mail được giao</p>
              <h3 className="text-2xl font-black text-white">{staffStats.totalAssigned}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20"><Mail size={24} /></div>
          </div>
          <div className="bg-sidebar border border-border-custom p-6 rounded-[24px] flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Đã làm</p>
              <h3 className="text-2xl font-black text-green-500">{staffStats.doneChannel}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20"><CheckCircle size={24} /></div>
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

      {isStaff && type === "SATELLITE" && !selectedBatch ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {staffBatches.map(([batchName, count]) => (
            <button
              key={batchName}
              onClick={() => setSelectedBatch(batchName)}
              className="bg-sidebar border border-white/10 hover:border-gold/50 p-6 rounded-[24px] text-left transition-all group shadow-xl hover:shadow-gold/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 group-hover:scale-110 transition-transform">
                  <Database size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-black/40 px-3 py-1 rounded-full">
                  {count} mail
                </span>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-gold transition-colors">{batchName}</h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">Bấm vào để xem và xử lý các mail trong lô này.</p>
            </button>
          ))}
        </div>
      ) : (
        <div className={`bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex flex-col ${selectedBatch
            ? "h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] lg:h-[calc(100vh-160px)]"
            : "h-[calc(100vh-220px)] md:h-[calc(100vh-240px)] lg:h-[calc(100vh-260px)]"
          }`}>
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              {isStaff && type === "SATELLITE" && selectedBatch && (
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="h-10 px-4 flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                  <ArrowLeft size={16} /> Quay lại
                </button>
              )}
              <h3 className="text-xl font-black text-white uppercase tracking-tighter shrink-0">Dữ liệu chi tiết {selectedBatch ? `- ${selectedBatch}` : ""}</h3>
              <div className="h-8 w-px bg-white/10 hidden md:block" />
              <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 h-10 w-full md:w-64 lg:w-80 focus-within:border-gold transition-all">
                <Search size={16} className="text-gray-500 shrink-0" />
                <input type="text" placeholder="Tìm kiếm Email hoặc Mail KP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white w-full" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
              >
                <option value="ALL" className="bg-sidebar text-white">Tất cả trạng thái</option>
                {type !== "MONETIZED" ? (
                  <>
                    <option value="Đã làm" className="bg-sidebar text-white">Đã làm</option>
                    <option value="Chưa làm" className="bg-sidebar text-white">Chưa làm</option>
                    <option value="Lỗi" className="bg-sidebar text-white">Lỗi</option>
                  </>
                ) : (
                  <>
                    <option value="Đã bán" className="bg-sidebar text-white">Đã bán</option>
                    <option value="Chưa bán" className="bg-sidebar text-white">Chưa bán</option>
                  </>
                )}
              </select>
              {isAdminOrManager && type === "SATELLITE" && (
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value as any)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
                >
                  <option value="ALL" className="bg-sidebar text-white">Trạng thái gán</option>
                  <option value="ASSIGNED" className="bg-sidebar text-white">Đã gán</option>
                  <option value="UNASSIGNED" className="bg-sidebar text-white">Chưa gán</option>
                </select>
              )}
              {isAdminOrManager && type === "ROOT" && (
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
                >
                  <option value="ALL" className="bg-sidebar text-white">Tất cả thời gian</option>
                  <option value="1_MONTH" className="bg-sidebar text-white">Làm trong 1 tháng</option>
                  <option value="2_MONTH" className="bg-sidebar text-white">Làm trong 2 tháng</option>
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

          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">STT</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Email</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Mail KP</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Pass</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">2FA</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">SĐT</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Link SĐT</th>
                    {isAdminOrManager && type === "SATELLITE" && (
                      <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Quản lý</th>
                    )}
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Trạng thái</th>
                    <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {currentItems.length > 0 ? currentItems.map((mail: any) => {
                    const rowPadding = isStaff ? "py-1.5 px-6" : "py-3.5 px-6";
                    const textSize = isStaff ? "text-xs" : "text-sm";
                    return (
                      <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className={`${rowPadding} text-[10px] font-black text-gray-500 whitespace-nowrap`}>{mail.originalSTT}</td>
                        <td className={`${rowPadding} cursor-pointer hover:text-gold transition-colors font-bold ${textSize} whitespace-nowrap`} onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                        <td className={`${rowPadding} cursor-pointer text-xs text-gray-400 hover:text-gold transition-colors whitespace-nowrap`} onClick={() => copyToClipboard(mail.recovery, "Mail KP")}>{mail.recovery}</td>
                        <td className={`${rowPadding} cursor-pointer text-xs text-gray-500 hover:text-gold transition-colors font-mono whitespace-nowrap`} onClick={() => copyToClipboard(mail.pass, "Mật khẩu")}>{mail.pass}</td>
                        <td className={`${rowPadding} cursor-pointer text-xs text-gray-500 hover:text-gold transition-colors font-mono whitespace-nowrap`} onClick={() => copyToClipboard(mail.twoFA || "", "2FA")}>{mail.twoFA || "---"}</td>
                        <td className={`${rowPadding} cursor-pointer text-xs text-gray-500 hover:text-gold transition-colors font-bold whitespace-nowrap`} onClick={() => copyToClipboard(mail.phone || "", "SĐT")}>{mail.phone || "---"}</td>
                        <td className={`${rowPadding} cursor-pointer whitespace-nowrap`} onClick={() => copyToClipboard(mail.otpLink || "", "Link OTP")}>
                          {mail.otpLink ? <span className="text-blue-400 hover:text-white transition-all flex items-center gap-1 font-bold text-xs whitespace-nowrap">Link OTP <ExternalLink size={12} /></span> : <span className="text-gray-700">---</span>}
                        </td>
                        {isAdminOrManager && type === "SATELLITE" && (
                          <td className={`${rowPadding} text-xs font-bold whitespace-nowrap`}>
                            {mail.assigneeId ? (
                              <span className="text-gold">
                                Đã gán cho {mail.assignedTo} - {mail.batchName}
                              </span>
                            ) : (
                              <span className="text-gray-500">Chưa gán</span>
                            )}
                          </td>
                        )}
                        <td className={`${rowPadding} text-center whitespace-nowrap`}>
                          {type === "MONETIZED" ? (
                            <select
                              value={mail.workStatus || "Chưa bán"}
                              onChange={(e) => handleWorkStatusChange(mail.id, e.target.value)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus || "Chưa bán")}`}
                            >
                              <option value="Chưa bán" className="bg-sidebar text-white">Chưa bán</option>
                              <option value="Đã bán" className="bg-sidebar text-white">Đã bán</option>
                            </select>
                          ) : (
                            <select
                              value={mail.workStatus || "Chưa làm"}
                              onChange={(e) => handleWorkStatusChange(mail.id, e.target.value)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus || "Chưa làm")}`}
                            >
                              <option value="Chưa làm" className="bg-sidebar text-white">Chưa làm</option>
                              <option value="Đã làm" className="bg-sidebar text-white">Đã làm</option>
                              <option value="Lỗi" className="bg-sidebar text-white">Lỗi</option>
                            </select>
                          )}
                        </td>
                        <td className={`${rowPadding} text-center whitespace-nowrap`}>
                          <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedMailForConfig(mail);
                              }}
                              className="px-4 py-1 rounded-xl bg-gold/10 hover:bg-gold hover:text-sidebar text-gold border border-gold/30 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold/5 font-black"
                            >
                              Xem chi tiết
                            </button>
                            {isAdminOrManager && (
                              <button onClick={() => deleteMail(mail.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-inner"><Trash2 size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={isAdminOrManager && type === "SATELLITE" ? 10 : 9} className="py-20 text-center text-gray-600 font-bold uppercase tracking-widest">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!(isStaff && type === "SATELLITE") && (
            <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Trang <span className="text-white font-black">{currentPage}</span> / {totalPages || 1}</span>
              <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronLeft size={18} /></button>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedMailForConfig && (
          <UnifiedMailDetailModal
            mail={selectedMailForConfig}
            type={selectedMailForConfig.type}
            user={user}
            onClose={() => setSelectedMailForConfig(null)}
            onSave={(updatedFields) => handleSaveUnifiedDetails(selectedMailForConfig.id, updatedFields)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
