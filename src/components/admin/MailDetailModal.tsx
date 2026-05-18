"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle,
  Database,
  ExternalLink,
  Mail
} from "lucide-react";
import { motion } from "framer-motion";

interface MailDetailModalProps {
  mail: any;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
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

  // State for MONETIZED
  const [reClickDate, setReClickDate] = useState(mail.reClickDate || "");
  const [step2PendingDate, setStep2PendingDate] = useState(
    mail.step2PendingDate || ""
  );
  const [channelStatusDetail, setChannelStatusDetail] = useState(
    mail.channelStatusDetail || "Chưa Done"
  );

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
      onSave({ links, channelNames: names, eligibleChannels });
    } else if (type === "MONETIZED") {
      onSave({ reClickDate, step2PendingDate, channelStatusDetail });
    }
    onClose();
  };

  // Format lastUpdated
  const formatLastUpdated = (iso?: string) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  };

  const lastUpdatedStr = formatLastUpdated(mail.lastUpdated);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-sidebar border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg font-black">
              {type === "ROOT" ? (
                <Database size={28} />
              ) : type === "SATELLITE" ? (
                <ExternalLink size={28} />
              ) : (
                <Mail size={28} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {type === "ROOT"
                  ? "Chi tiết Mail Gốc"
                  : type === "SATELLITE"
                  ? "Chi tiết Mail Vệ Tinh"
                  : "Cấu hình Kiếm Tiền"}
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                {mail?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {type === "ROOT" && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Quét lại CCCD vào ngày
                </label>
                <input
                  type="date"
                  value={cccdDate}
                  onChange={(e) => setCccdDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Tình trạng xác minh
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                >
                  <option value="Mail Veri mail" className="bg-sidebar text-white">
                    Mail Veri mail
                  </option>
                  <option value="Đã xanh" className="bg-sidebar text-white">
                    Đã xanh
                  </option>
                  <option value="Chưa xanh" className="bg-sidebar text-white">
                    Chưa xanh
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
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Link YouTube {idx + 1}
                    </label>
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
                        className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-shrink-0 ${
                          !links[idx] || links[idx].trim() === ""
                            ? "bg-white/[0.02] text-gray-600 border-white/5 cursor-not-allowed opacity-40"
                            : eligibleChannels[idx]
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
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Ngày bấm lại
                </label>
                <input
                  type="date"
                  value={reClickDate}
                  onChange={(e) => setReClickDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Chờ bước 2
                </label>
                <input
                  type="date"
                  value={step2PendingDate}
                  onChange={(e) => setStep2PendingDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Trạng thái chi tiết
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Chờ bước 3",
                    "Mất kênh",
                    "Chưa SUB",
                    "DONE",
                    "Gắn lại gà",
                    "Die Spam",
                    "Chưa Done"
                  ].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setChannelStatusDetail(status)}
                      className={`h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                        channelStatusDetail === status
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

        {/* Footer */}
        <div className="grid grid-cols-2 gap-4 mt-8 relative z-10 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
          >
            Lưu cập nhật
          </button>
        </div>

        {/* lastUpdated */}
        {lastUpdatedStr && (
          <div className="flex items-center justify-center mt-4 relative z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/10">
              <span className="text-[10px] font-black text-gold/60 uppercase tracking-widest">Cập nhật lần cuối:</span>
              <span className="text-sm font-black text-gold">{lastUpdatedStr}</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
