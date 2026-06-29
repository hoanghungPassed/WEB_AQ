"use client";

import React, { useState } from "react";
import {
  Database,
  ExternalLink,
  Mail,
  AlertCircle,
  CheckCircle2,
  Copy,
} from "lucide-react";
import {
  validateYouTubeUrl,
  fetchChannelName,
  cleanYouTubeUrl
} from "./youtubeUtils";
import { Modal } from "@/components/ui/Modal";
import { MailData, StaffData } from "@/types/admin";
import { toast } from "react-hot-toast";

interface MailDetailModalProps {
  mail: MailData;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  user: StaffData | null;
  viewOnly?: boolean;
  onClose: () => void;
  onSave: (updatedFields: Partial<MailData>) => void;
}

export default function MailDetailModal({
  mail,
  type,
  user,
  viewOnly = false,
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
  
  // Link errors toggles (initialized to true for empty/missing entries if mail.workStatus === "Lỗi")
  const [linkErrors, setLinkErrors] = useState<boolean[]>(() => {
    const isMailLoi = mail.workStatus === "Lỗi";
    return [0, 1, 2].map(idx => {
      if (isMailLoi) {
        const linkVal = mail.links?.[idx];
        return !linkVal || linkVal.trim() === "";
      }
      return false;
    });
  });

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
      const anyEmpty = links.some(l => !l || l.trim() === "");
      if (anyEmpty) {
        toast.error("Vui lòng điền đầy đủ cả 3 link kênh YouTube!");
        return;
      }

      const hasValidationError = links.some((l, idx) => validationErrors[idx]);
      if (hasValidationError) {
        toast.error("Một hoặc nhiều link không đúng định dạng YouTube hoặc bị trùng!");
        return;
      }

      // Calculate workStatus
      let calculatedWorkStatus = "Chưa làm";
      const hasErrorLink = linkErrors.some(e => e === true);
      if (hasErrorLink) {
        calculatedWorkStatus = "Lỗi";
      } else {
        const allFilledAndValid = links.every((l, idx) => l && l.trim() !== "" && !validationErrors[idx]);
        if (allFilledAndValid) {
          calculatedWorkStatus = "Đã làm";
        } else {
          calculatedWorkStatus = "Chưa làm";
        }
      }

      onSave({ 
        links: (links || []).map(l => cleanYouTubeUrl(l)), 
        channelNames: names,
        eligibleChannels,
        workStatus: calculatedWorkStatus
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
          {!viewOnly && (
            <button onClick={handleSave} className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20">Lưu cập nhật</button>
          )}
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
                disabled={viewOnly}
                readOnly={viewOnly}
                onChange={(e) => setCccdDate(e.target.value)}
                className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer ${viewOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tình trạng xác minh</label>
              <select
                value={verificationStatus}
                disabled={viewOnly}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer ${viewOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <option value="Xanh dòng 3" className="bg-zinc-900 text-white hover:bg-zinc-700">Xanh dòng 3</option>
                <option value="chưa xanh dòng 3" className="bg-zinc-900 text-white hover:bg-zinc-700">Chưa xanh dòng 3</option>
                <option value="lỗi" className="bg-zinc-900 text-white hover:bg-zinc-700">Lỗi</option>
                <option value="đang hoạt động" className="bg-zinc-900 text-white hover:bg-zinc-700">Đang hoạt động</option>
                <option value="chưa mời" className="bg-zinc-900 text-white hover:bg-zinc-700">Chưa mời</option>
                <option value="đã mời" className="bg-zinc-900 text-white hover:bg-zinc-700">Đã mời</option>
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
                    <button
                      type="button"
                      onClick={() => {
                        if (names[idx] && !scanning[idx] && !validationErrors[idx]) {
                          navigator.clipboard.writeText(names[idx]);
                          toast.success(`Đã sao chép tên kênh: ${names[idx]}`);
                        }
                      }}
                      className={`font-black text-gold text-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 select-none`}
                      title="Chạm để sao chép tên kênh"
                    >
                      <span className="truncate max-w-[200px] md:max-w-[300px]">{names[idx]}</span>
                      <Copy size={16} className="text-gold/75 hover:text-gold" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    value={links[idx] || ""} 
                    onChange={viewOnly ? undefined : (e) => handleLinkChange(idx, e.target.value)} 
                    placeholder="Dán link channel YouTube..." 
                    readOnly={viewOnly}
                    className={`flex-1 h-14 bg-white/5 border rounded-2xl px-6 text-white text-base outline-none transition-all ${
                      validationErrors[idx] ? "border-red-500/50 focus:border-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : " border-white/0 focus:border-white/5"
                    } ${viewOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                  {viewOnly ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (links[idx]) {
                          navigator.clipboard.writeText(links[idx]);
                          toast.success("Đã sao chép link!");
                        } else {
                          toast.error("Không có link để sao chép!");
                        }
                      }}
                      className="h-14 px-5 bg-white/5 border border-white/10 hover:border-gold hover:text-gold text-white rounded-2xl flex items-center justify-center gap-2 transition-all shrink-0 font-bold text-xs"
                      title="Sao chép link"
                    >
                      📋 Sao chép
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const newLinkErrors = [...linkErrors];
                          newLinkErrors[idx] = !newLinkErrors[idx];
                          setLinkErrors(newLinkErrors);
                        }}
                        className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 shrink-0 ${
                          linkErrors[idx]
                            ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                            : "bg-white/5 text-red-500 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40"
                        }`}
                      >
                        Lỗi
                      </button>
                      {isAdminOrManager && (
                        <button
                          type="button"
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
                          Đủ giờ
                        </button>
                      )}
                    </>
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
                disabled={viewOnly}
                readOnly={viewOnly}
                onChange={(e) => setReClickDate(e.target.value)}
                className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer ${viewOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chờ bước 2</label>
              <input
                type="date"
                value={step2PendingDate}
                disabled={viewOnly}
                readOnly={viewOnly}
                onChange={(e) => setStep2PendingDate(e.target.value)}
                className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all cursor-pointer ${viewOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Trạng thái chi tiết</label>
              <div className="grid grid-cols-2 gap-3">
                {["Chờ bước 3", "Mất kênh", "Chưa SUB", "DONE", "Gắn lại gà", "Die Spam", "Chưa Done"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={viewOnly}
                    onClick={() => setChannelStatusDetail(status)}
                    className={`h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                      channelStatusDetail === status ? "bg-gold/20 text-gold border-gold/45 shadow-lg shadow-gold/5" : " bg-white/5 text-gray-400 border-white/0 hover:bg-white/10"
                    } ${viewOnly ? "opacity-60 cursor-not-allowed" : ""}`}
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

