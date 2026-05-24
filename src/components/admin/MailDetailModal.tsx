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
 className="fixed inset-0 z-[400] bg-white/95 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.95, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 className="bg-gray-900 border border-white/10 w-full max-w-4xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[90vh]"
 >
 <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

 {/* Header */}
 <div className="flex items-center justify-between mb-8 relative z-10">
 <div className="flex items-center gap-4">
 <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg font-black">
 {type ==="ROOT" ? (
 <Database size={28} />
 ) : type ==="SATELLITE" ? (
 <ExternalLink size={28} />
 ) : (
 <Mail size={28} />
 )}
 </div>
 <div>
 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
 {type ==="ROOT"
 ?"Chi tiết Mail Gốc"
 : type ==="SATELLITE"
 ?"Chi tiết Mail Vệ Tinh"
 :"Cấu hình Kiếm Tiền"}
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
 {type ==="ROOT" && (
 <>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 Quét lại CCCD vào ngày
 </label>
 <input
 type="date"
 value={cccdDate}
 onChange={(e) => setCccdDate(e.target.value)}
 className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-base outline-none focus:border-gold/50 transition-all cursor-pointer"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 Tình trạng xác minh
 </label>
 <select
 value={verificationStatus}
 onChange={(e) => setVerificationStatus(e.target.value)}
 className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-base outline-none focus:border-gold/50 transition-all cursor-pointer"
 >
 <option value="Mail veri" className="bg-sidebar text-white">
 Mail veri
 </option>
 <option value="Đã xanh" className="bg-sidebar text-white">
 Đã xanh
 </option>
 <option value="Chưa xanh" className="bg-sidebar text-white">
 Chưa xanh
 </option>
 <option value="Quét CCCD" className="bg-sidebar text-white">
 Quét CCCD
 </option>
 </select>
 </div>
 </>
 )}

 {type ==="SATELLITE" && (
 <>
 {[0, 1, 2].map((idx) => (
 <div key={idx} className="space-y-2">
 <div className="flex items-center justify-between ml-1">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
 Link YouTube {idx + 1}
 </label>
 {names[idx] && (
 <span className={`text-[10px] font-black uppercase ${
 validationErrors[idx] ?"text-red-400" :"text-gold"
 }`}>
 {names[idx]}
 </span>
 )}
 </div>
 <div className="flex items-center gap-3">
 <input
 value={links[idx] ||""}
 onChange={(e) => handleLinkChange(idx, e.target.value)}
 placeholder="Dán link channel YouTube..."
 className={`flex-1 h-14 bg-white/5 border rounded-2xl px-6 text-white text-base outline-none transition-all ${
 validationErrors[idx]
 ?"border-red-500/50 focus:border-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
 :" border-white/10 focus:border-gold/50"
 }`}
 />
 <button
 type="button"
 onClick={() => {
 if (!links[idx] || links[idx].trim() ==="") return;
 const newErrors = [...linkErrors];
 newErrors[idx] = !newErrors[idx];
 setLinkErrors(newErrors);
 }}
 disabled={!links[idx] || links[idx].trim() ===""}
 title={
 !links[idx] || links[idx].trim() ===""
 ?"Cần điền link YouTube trước"
 :""
 }
 className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-shrink-0 ${
 !links[idx] || links[idx].trim() ===""
 ?" bg-white/[0.02] border-white/5 cursor-not-allowed opacity-40"
 : linkErrors[idx]
 ?"bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
 :"bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40"
 }`}
 >
 <AlertCircle size={16} />
 {linkErrors[idx] ?"Lỗi" :"Báo Lỗi"}
 </button>
 {isAdminOrManager && (
 <button
 onClick={() => {
 if (!links[idx] || links[idx].trim() ==="") return;
 const newEligible = [...eligibleChannels];
 newEligible[idx] = !newEligible[idx];
 setEligibleChannels(newEligible);
 }}
 disabled={!links[idx] || links[idx].trim() ===""}
 title={
 !links[idx] || links[idx].trim() ===""
 ?"Cần điền link YouTube trước khi đánh dấu đủ giờ"
 :""
 }
 className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-shrink-0 ${
 !links[idx] || links[idx].trim() ===""
 ?" bg-white/[0.02] border-white/5 cursor-not-allowed opacity-40"
 : eligibleChannels[idx]
 ?"bg-gold text-sidebar border-gold shadow-lg shadow-gold/20"
 :" bg-white/5 text-gray-400 border-white/10 hover:border-gold/30 hover:text-gold"
 }`}
 >
 <CheckCircle size={16} />
 {eligibleChannels[idx] ?"Đủ giờ" :"Đánh dấu"}
 </button>
 )}
 </div>
 </div>
 ))}
 </>
 )}

 {type ==="MONETIZED" && (
 <>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 Ngày bấm lại
 </label>
 <input
 type="date"
 value={reClickDate}
 onChange={(e) => setReClickDate(e.target.value)}
 className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-base outline-none focus:border-gold/50 transition-all cursor-pointer"
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
 className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-base outline-none focus:border-gold/50 transition-all cursor-pointer"
 />
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 Trạng thái chi tiết
 </label>
 <div className="grid grid-cols-2 gap-3">
 {["Chờ bước 3","Mất kênh","Chưa SUB","DONE","Gắn lại gà","Die Spam","Chưa Done"
 ].map((status) => (
 <button
 key={status}
 type="button"
 onClick={() => setChannelStatusDetail(status)}
 className={`h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
 channelStatusDetail === status
 ?"bg-gold/20 text-gold border-gold/45 shadow-lg shadow-gold/5"
 :" bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
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
 className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all"
 >
 Đóng
 </button>
 <button
 onClick={handleSave}
 className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
 >
 Lưu cập nhật
 </button>
 </div>

 {/* Update History Footer */}
 <div className="flex items-center justify-center mt-4 relative z-10">
 <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/10">
 <span className="text-[10px] font-black text-gold/80 uppercase tracking-widest">
 Cập nhật lần cuối ngày: <span className="text-white font-mono">{updatedAtStr ||"---"}</span> {mail.updatedBy && <>- Người sửa: <span className="text-white">{mail.updatedBy}</span></>}
 </span>
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
}
