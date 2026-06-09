"use client";

import React, { useState } from "react";
import {
  Database,
  ExternalLink,
  Mail,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import {
  validateYouTubeUrl,
  fetchChannelName,
  cleanYouTubeUrl
} from "./youtubeUtils";
import { Modal } from "@/components/ui/Modal";
import { MailData, StaffData } from "@/types/admin";

interface MailDetailModalProps {
  mail: MailData;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  user: StaffData | null;
  onClose: () => void;
  onSave: (updatedFields: Partial<MailData>) => void;
}

export default function MailDetailModal({
  mail,
  type,
  user,
  onClose,
  onSave
}: MailDetailModalProps) {
  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager =
    roleUpper === "01" ||
    roleUpper === "ADMIN" ||
    roleUpper === "02" ||
    roleUpper === "QL CÔNG VIỆC" ||
    roleUpper === "QUẢN LÝ CÔNG VIỆC";

  // State for ROOT
  const [cccdDate, setCccdDate] = useState(mail.cccdDate || "");
  const [verificationStatus, setVerificationStatus] = useState(
    mail.verificationStatus || "Chưa xanh"
  );

  // State for SATELLITE
  const [links, setLinks] = useState<string[]>(mail.links || ["", "", ""]);
  const [names, setNames] = useState<string[]>(
    mail.channelNames || ["", "", ""]
  );
  const [scanning, setScanning] = useState<boolean[]>([false, false, false]);
  const [eligibleChannels, setEligibleChannels] = useState<boolean[]>(
    mail.eligibleChannels || [false, false, false]
  );
  
  // Validation errors for each link
  const [validationErrors, setValidationErrors] = useState<boolean[]>(() => {
    const initLinks = mail.links || ["", "", ""];
    return (initLinks || []).map((link: string, i: number) => {
      if (!link || link.trim() === "") return false;
      const cleaned = cleanYouTubeUrl(link);
      if (!validateYouTubeUrl(link)) return true;
      const isDuplicateLocal = initLinks.some((l: string, idx: number) => idx !== i && l && cleanYouTubeUrl(l) === cleaned);
      return isDuplicateLocal;
    });
  });

  // State for MONETIZED
  const [reClickDate, setReClickDate] = useState(mail.reClickDate || "");
  const [step2PendingDate, setStep2PendingDate] = useState(
    mail.step2PendingDate || ""
  );
  const [channelStatusDetail, setChannelStatusDetail] = useState(
    mail.channelStatusDetail || "Chưa Done"
  );

  const handleLinkChange = async (idx: number, val: string) => {
    const newLinks = [...links];
    newLinks[idx] = val;
    setLinks(newLinks);

    const newValidationErrors = [...validationErrors];
    const newNames = [...names];

    if (!val.trim()) {
      newValidationErrors[idx] = false;
      newNames[idx] = "";
      setValidationErrors(newValidationErrors);
      setNames(newNames);
      return;
    }

    if (!validateYouTubeUrl(val)) {
      newValidationErrors[idx] = true;
      newNames[idx] = "Link không đúng định dạng YouTube";
      setValidationErrors(newValidationErrors);
      setNames(newNames);
      return;
    }

    const cleanedVal = cleanYouTubeUrl(val);
    const isDuplicateLocal = newLinks.some((l, i) => i !== idx && l && cleanYouTubeUrl(l) === cleanedVal);
    if (isDuplicateLocal) {
      newValidationErrors[idx] = true;
      newNames[idx] = "Link đã được điền ở ô khác!";
      setValidationErrors(newValidationErrors);
      setNames(newNames);
      return;
    }

    newValidationErrors[idx] = false;
    setValidationErrors(newValidationErrors);

    const newScanning = [...scanning];
    newScanning[idx] = true;
    setScanning(newScanning);

    newNames[idx] = "Đang quét thông tin kênh...";
    setNames(newNames);

    try {
      const realName = await fetchChannelName(val);
      const finalNames = [...names];
      finalNames[idx] = realName;
      setNames(finalNames);
    } catch (err) {
      console.error("Error fetching channel details:", err);
    } finally {
      const finalScanning = [...scanning];
      finalScanning[idx] = false;
      setScanning(finalScanning);
    }
  };

  const handleSave = () => {
    if (type === "ROOT") {
      onSave({ cccdDate, verificationStatus });
    } else if (type === "SATELLITE") {
      const hasMissingOrError = links.some((l, idx) => !l || l.trim() === "" || validationErrors[idx]);
      if (hasMissingOrError) {
        alert("Thiếu kênh hoặc sai định dạng! Vui lòng điền đủ 3 link kênh hợp lệ trước khi cập nhật.");
        return;
      }
      onSave({ 
        links: (links || []).map(l => cleanYouTubeUrl(l)), 
        channelNames: names,
        eligibleChannels
      });
    } else if (type === "MONETIZED") {
      onSave({ reClickDate, step2PendingDate, channelStatusDetail });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={type === "ROOT" ? "Chi tiết Mail Gốc" : type === "SATELLITE" ? "Chi tiết Mail Vệ Tinh" : "Cấu hình Kiếm Tiền"}
      subtitle={mail?.email}
      icon={type === "ROOT" ? <Database size={28} /> : type === "SATELLITE" ? <ExternalLink size={28} /> : <Mail size={28} />}
      footer={
        <>
          <button onClick={onClose} className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all">Đóng</button>
          <button onClick={handleSave} className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20">Lưu cập nhật</button>
        </>
      }
    >
      <div className="space-y-6">
        {type === "ROOT" && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quét lại CCCD vào ngày</label>
              <input
                type="date"
                value={cccdDate}
                onChange={(e) => setCccdDate(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tình trạng xác minh</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer"
              >
                <option value="Mail Veri mail" className="bg-zinc-900 text-white hover:bg-zinc-700">Mail Veri mail</option>
                <option value="Đã xanh" className="bg-zinc-900 text-white hover:bg-zinc-700">Đã xanh</option>
                <option value="Chưa xanh" className="bg-zinc-900 text-white hover:bg-zinc-700">Chưa xanh</option>
              </select>
            </div>
          </>
        )}

        {type === "SATELLITE" && (
          <div className="space-y-6">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Link YouTube {idx + 1}</label>
                  {names[idx] && (
                    <span className={`text-[10px] font-black uppercase ${validationErrors[idx] ? "text-red-400" : "text-gold"}`}>
                      {names[idx]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    value={links[idx] || ""} 
                    onChange={(e) => handleLinkChange(idx, e.target.value)} 
                    placeholder="Dán link channel YouTube..." 
                    className={`flex-1 h-14 bg-white/5 border rounded-2xl px-6 text-white text-base outline-none transition-all ${
                      validationErrors[idx] ? "border-red-500/50 focus:border-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : " border-white/0 focus:border-white/5"
                    }`}
                  />
                  {isAdminOrManager && (
                    <button
                      onClick={() => {
                        const newEligible = [...eligibleChannels];
                        newEligible[idx] = !newEligible[idx];
                        setEligibleChannels(newEligible);
                      }}
                      className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-shrink-0 ${
                        eligibleChannels[idx] ? "bg-gold text-sidebar border-gold shadow-lg shadow-gold/20" : " bg-white/5 text-gray-400 border-white/0 hover:border-white/0 hover:text-gold"
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      {eligibleChannels[idx] ? "Đủ giờ" : "Đánh dấu"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {type === "MONETIZED" && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ngày bấm lại</label>
              <input
                type="date"
                value={reClickDate}
                onChange={(e) => setReClickDate(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chờ bước 2</label>
              <input
                type="date"
                value={step2PendingDate}
                onChange={(e) => setStep2PendingDate(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer"
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
                    className={`h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                      channelStatusDetail === status ? "bg-gold/20 text-gold border-gold/45 shadow-lg shadow-gold/5" : " bg-white/5 text-gray-400 border-white/0 hover:bg-white/10"
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
    </Modal>
  );
}
