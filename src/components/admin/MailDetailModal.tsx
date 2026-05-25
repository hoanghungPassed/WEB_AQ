"use client";

import React, { useState } from"react";
import {
 X,
 CheckCircle,
 Database,
 ExternalLink,
 Mail,
 AlertCircle
} from"lucide-react";
import { motion } from"framer-motion";
import {
 validateYouTubeUrl,
 fetchChannelName,
 cleanYouTubeUrl
} from"./youtubeUtils";

interface MailDetailModalProps {
 mail: any;
 type:"ROOT" |"SATELLITE" |"MONETIZED";
 user: any;
 onClose: () => void;
 onSave: (updatedFields: any) => void;
}

export default function MailDetailModal({
 mail,
 type,
 user,
 onClose,
 onSave
}: MailDetailModalProps) {
 const roleUpper = String(user?.role ||"").toUpperCase();
 const isAdminOrManager =
 roleUpper ==="01" ||
 roleUpper ==="ADMIN" ||
 roleUpper ==="02" ||
 roleUpper ==="QL CÔNG VIỆC" ||
 roleUpper ==="QUẢN LÝ CÔNG VIỆC";

 // State for ROOT
 const [cccdDate, setCccdDate] = useState(mail.cccdDate ||"");
 const [verificationStatus, setVerificationStatus] = useState(
 mail.verificationStatus ||"Chưa xanh"
 );

 // State for SATELLITE
 const [links, setLinks] = useState<string[]>(mail.links || ["","",""]);
 const [names, setNames] = useState<string[]>(
 mail.channelNames || ["","",""]
 );
 const [scanning, setScanning] = useState<boolean[]>([false, false, false]);
 const [eligibleChannels, setEligibleChannels] = useState<boolean[]>(
 mail.eligibleChannels || [false, false, false]
 );
 const [linkErrors, setLinkErrors] = useState<boolean[]>(
 mail.linkErrors || [false, false, false]
 );
 
 // Validation errors for each link (checks format, local duplicate, and global duplicate)
 const [validationErrors, setValidationErrors] = useState<boolean[]>(() => {
 const initLinks = mail.links || ["","",""];

 return (initLinks || []).map((link: string, i: number) => {
 if (!link || link.trim() ==="") return false;
 
 const cleaned = cleanYouTubeUrl(link);
 const isFormatInvalid = !validateYouTubeUrl(link);
 if (isFormatInvalid) return true;

 // Check local duplicates inside this mail
 const isDuplicateLocal = initLinks.some((l: string, idx: number) => idx !== i && l && cleanYouTubeUrl(l) === cleaned);
 if (isDuplicateLocal) return true;

 return false;
 });
 });

 // State for MONETIZED
 const [reClickDate, setReClickDate] = useState(mail.reClickDate ||"");
 const [step2PendingDate, setStep2PendingDate] = useState(
 mail.step2PendingDate ||""
 );
 const [channelStatusDetail, setChannelStatusDetail] = useState(
 mail.channelStatusDetail ||"Chưa Done"
 );

 const handleLinkChange = async (idx: number, val: string) => {
 const newLinks = [...links];
 newLinks[idx] = val;
 setLinks(newLinks);

 const newValidationErrors = [...validationErrors];
 const newNames = [...names];

 if (!val.trim()) {
 newValidationErrors[idx] = false;
 newNames[idx] ="";
 setValidationErrors(newValidationErrors);
 setNames(newNames);
 return;
 }

 // 1. Validate format
 const isValid = validateYouTubeUrl(val);
 if (!isValid) {
 newValidationErrors[idx] = true;
 newNames[idx] ="Link không đúng định dạng YouTube";
 setValidationErrors(newValidationErrors);
 setNames(newNames);
 return;
 }

 const cleanedVal = cleanYouTubeUrl(val);

 // 2. Check local duplicates within the current mail inputs
 const isDuplicateLocal = newLinks.some((l, i) => i !== idx && l && cleanYouTubeUrl(l) === cleanedVal);
 if (isDuplicateLocal) {
 newValidationErrors[idx] = true;
 newNames[idx] ="Link đã được điền ở ô khác!";
 setValidationErrors(newValidationErrors);
 setNames(newNames);
 return;
 }

 // Link is completely valid & unique, proceed to fetch the real channel name
 newValidationErrors[idx] = false;
 setValidationErrors(newValidationErrors);

 const newScanning = [...scanning];
 newScanning[idx] = true;
 setScanning(newScanning);

 newNames[idx] ="Đang quét thông tin kênh...";
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
 if (type ==="ROOT") {
 onSave({ cccdDate, verificationStatus });
 } else if (type ==="SATELLITE") {
 // Validate all filled links before saving
 const hasError = validationErrors.some((err, idx) => err && links[idx]?.trim() !=="");
 if (hasError) {
 alert("Không thể lưu! Vui lòng sửa các link kênh bị sai định dạng YouTube.");
 return;
 }

 onSave({ links, channelNames: names, eligibleChannels, linkErrors });
 } else if (type ==="MONETIZED") {
 onSave({ reClickDate, step2PendingDate, channelStatusDetail });
 }
 onClose();
 };

 // Format updatedAt to HH:mm DD/MM/YYYY
 const formatUpdatedAt = (iso?: string) => {
 if (!iso) return null;
 try {
 const d = new Date(iso);
 const pad = (n: number) => String(n).padStart(2,"0");
 return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
 } catch {
 return iso;
 }
 };

 const updatedAtStr = formatUpdatedAt(mail.updatedAt || mail.lastUpdated);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-sm font-bold">
              {type === "ROOT" ? (
                <Database size={24} />
              ) : type === "SATELLITE" ? (
                <ExternalLink size={24} />
              ) : (
                <Mail size={24} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-tight">
                {type === "ROOT"
                  ? "Chi tiết Mail Gốc"
                  : type === "SATELLITE"
                  ? "Chi tiết Mail Vệ Tinh"
                  : "Cấu hình Kiếm Tiền"}
              </h2>
              <p className="text-xs text-zinc-400 font-semibold tracking-wide mt-0.5">
                {mail?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full flex items-center justify-center border border-zinc-700/50 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {type === "ROOT" && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Quét lại CCCD vào ngày
                </label>
                <input
                  type="date"
                  value={cccdDate}
                  onChange={(e) => setCccdDate(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-zinc-100 text-sm outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Tình trạng xác minh
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-zinc-100 text-sm outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                >
                  <option value="Mail veri" className="bg-zinc-900 text-zinc-100">
                    Mail veri
                  </option>
                  <option value="Đã xanh" className="bg-zinc-900 text-zinc-100">
                    Đã xanh
                  </option>
                  <option value="Chưa xanh" className="bg-zinc-900 text-zinc-100">
                    Chưa xanh
                  </option>
                  <option value="Quét CCCD" className="bg-zinc-900 text-zinc-100">
                    Quét CCCD
                  </option>
                </select>
              </div>
            </>
          )}

          {type === "SATELLITE" && (
            <>
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Link YouTube {idx + 1}
                    </label>
                    {names[idx] && (
                      <span className={`text-[10px] font-bold uppercase ${
                        validationErrors[idx] ? "text-red-400" : "text-amber-500"
                      }`}>
                        {names[idx]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      value={links[idx] || ""}
                      onChange={(e) => handleLinkChange(idx, e.target.value)}
                      placeholder="Dán link channel YouTube..."
                      className={`flex-1 h-12 bg-zinc-950 border rounded-xl px-4 text-zinc-100 text-sm outline-none transition-all ${
                        validationErrors[idx]
                          ? "border-red-500/50 focus:border-red-500 bg-red-500/5"
                          : "border-zinc-800 focus:border-amber-500/50"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!links[idx] || links[idx].trim() === "") return;
                        const newErrors = [...linkErrors];
                        newErrors[idx] = !newErrors[idx];
                        setLinkErrors(newErrors);
                      }}
                      disabled={!links[idx] || links[idx].trim() === ""}
                      title={
                        !links[idx] || links[idx].trim() === ""
                          ? "Cần điền link YouTube trước"
                          : ""
                      }
                      className={`h-12 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border flex items-center gap-1.5 flex-shrink-0 ${
                        !links[idx] || links[idx].trim() === ""
                          ? "bg-zinc-900 border-zinc-800 cursor-not-allowed opacity-40 text-zinc-500"
                          : linkErrors[idx]
                          ? "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm"
                          : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                      }`}
                    >
                      <AlertCircle size={14} />
                      {linkErrors[idx] ? "Lỗi" : "Báo Lỗi"}
                    </button>
                    {isAdminOrManager && (
                      <button
                        onClick={() => {
                          if (!links[idx] || links[idx].trim() === "") return;
                          const newEligible = [...eligibleChannels];
                          newEligible[idx] = !newEligible[idx];
                          setEligibleChannels(newEligible);
                        }}
                        disabled={!links[idx] || links[idx].trim() === ""}
                        title={
                          !links[idx] || links[idx].trim() === ""
                            ? "Cần điền link YouTube trước khi đánh dấu đủ giờ"
                            : ""
                        }
                        className={`h-12 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border flex items-center gap-1.5 flex-shrink-0 ${
                          !links[idx] || links[idx].trim() === ""
                            ? "bg-zinc-900 border-zinc-800 cursor-not-allowed opacity-40 text-zinc-500"
                            : eligibleChannels[idx]
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-zinc-800 text-zinc-300 border-zinc-700/50 hover:border-amber-500/30 hover:text-amber-500"
                        }`}
                      >
                        <CheckCircle size={14} />
                        {eligibleChannels[idx] ? "Đủ giờ" : "Đủ giờ"}
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
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Ngày bấm lại
                </label>
                <input
                  type="date"
                  value={reClickDate}
                  onChange={(e) => setReClickDate(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-zinc-100 text-sm outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Chờ bước 2
                </label>
                <input
                  type="date"
                  value={step2PendingDate}
                  onChange={(e) => setStep2PendingDate(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-zinc-100 text-sm outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Trạng thái chi tiết
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  {["Chờ bước 3", "Mất kênh", "Chưa SUB", "DONE", "Gắn lại gà", "Die Spam", "Chưa Done"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setChannelStatusDetail(status)}
                      className={`h-11 rounded-xl font-bold text-[10px] uppercase tracking-wider border transition-all ${
                        channelStatusDetail === status
                          ? "bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-sm"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
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

        {/* Footer */}
        <div className="grid grid-cols-2 gap-4 mt-6 relative z-10 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/10"
          >
            Lưu cập nhật
          </button>
        </div>

        {/* Update History Footer */}
        <div className="flex items-center justify-center mt-4 relative z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950">
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
              Cập nhật lần cuối ngày: <span className="text-zinc-100 font-mono font-bold">{updatedAtStr || "---"}</span> 
              {mail.updatedBy && (
                <>
                  {" "} - Người sửa:{" "}
                  <span className="text-amber-500 font-bold">
                    {typeof mail.updatedBy === "object"
                      ? (mail.updatedBy?.name || mail.updatedBy?.username || "Hệ thống")
                      : String(mail.updatedBy)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
