"use client";

import React, { useState, useEffect, useMemo, useCallback } from"react";
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
 Copy,
 Phone,
 FileText,
 Calendar,
 User as UserIcon
} from"lucide-react";
import TOTPDisplay from"./TOTPDisplay";
import { motion, AnimatePresence } from"framer-motion";
import * as XLSX from"xlsx";
import { MailData } from"@/types/admin";

import { useRouter } from"next/navigation";
import MailDetailModal from"@/components/admin/MailDetailModal";

type ImportHistoryItem = {
 id: string;
 type:"ALL" |"MAIL" |"SĐT";
 fileName: string;
 quantity: number;
 importedAt: string;
 importedBy: string;
};


interface MailManagementProps {
 type:"ROOT" |"SATELLITE" |"MONETIZED" |"ALL";
 user: { id?: string; role?: string; name?: string; username?: string } | null;
}

export default function MailManagement({ type, user }: MailManagementProps) {
 const router = useRouter();
 const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
 const [historyTab, setHistoryTab] = useState<"ALL" |"MAIL" |"SĐT">("ALL");

 useEffect(() => {
 // History is no longer loaded from localStorage. 
 // Wait for actual API if available, or just empty.
 }, []);

 const filteredHistory = useMemo(() => {
 if (historyTab ==="ALL") return importHistory;
 return (importHistory || []).filter((item) => item.type === historyTab);
 }, [importHistory, historyTab]);

 const handleDeleteHistoryRow = async (id: string) => {
 if (!confirm("Bạn có chắc chắn muốn xóa dòng lịch sử import này? (Không ảnh hưởng đến dữ liệu đã import)")) return;
 const updated = (importHistory || []).filter((item) => item.id !== id);
 setImportHistory(updated);
 };

 const handleClearAllHistory = async () => {
 if (!confirm("Xác nhận xóa TOÀN BỘ lịch sử import? Hành động này không thể hoàn tác.")) return;
 setImportHistory([]);
 };

 const [mails, setMails] = useState<MailData[]>([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("ALL");
 const [dateFilter, setDateFilter] = useState<"ALL" |"1_WEEK" |"1_MONTH" |"2_MONTH">("ALL");
 const [assignmentFilter, setAssignmentFilter] = useState<"ALL" |"ASSIGNED" |"UNASSIGNED">("ALL");
 const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
 const [selectedBatchFilter, setSelectedBatchFilter] = useState("ALL");
 const [currentPage, setCurrentPage] = useState(1);
 const [showToast, setShowToast] = useState(false);
 const [toastMsg, setToastMsg] = useState("");

 // Modals States
 const [showManualImport, setShowManualImport] = useState(false);
 const [showConfirm, setShowConfirm] = useState(false);
 const [confirmConfig, setConfirmConfig] = useState({ title:"", msg:"", onConfirm: () => { } });
 const [selectedMailForConfig, setSelectedMailForConfig] = useState<MailData | null>(null);

 const [manualData, setManualData] = useState("");
 const [pendingMails, setPendingMails] = useState<MailData[] | null>(null);
 const [importBatchName, setImportBatchName] = useState("");
 const [showBatchNameModal, setShowBatchNameModal] = useState(false);
 const [showHistoryModal, setShowHistoryModal] = useState(false);
 const itemsPerPage = 20;

 const triggerToast = useCallback((msg: string) => {
 setToastMsg(msg);
 setShowToast(true);
 setTimeout(() => setShowToast(false), 2000);
 }, []);

 const roleUpper = String(user?.role ||"").toUpperCase();
 const isStaff = roleUpper ==="04" || 
 roleUpper ==="05" || 
 roleUpper ==="NHÂN VIÊN" || 
 roleUpper ==="NV THỬ VIỆC" || 
 roleUpper ==="03" || 
 roleUpper ==="QL NHÂN SỰ" || 
 roleUpper ==="QUẢN LÝ NHÂN SỰ";
 const isAdminOrManager = roleUpper ==="01" || 
 roleUpper ==="ADMIN" || 
 roleUpper ==="02" || 
 roleUpper ==="QL CÔNG VIỆC" || 
 roleUpper ==="QUẢN LÝ CÔNG VIỆC";

 useEffect(() => {
 const loadData = async () => {
 try {
 const res = await fetch('/api/admin/mails');
 const data = await res.json();
 console.log("Dữ liệu nhận từ DB:", data);
 if (data.success) {

 setMails(data.data || []);
 } else {
 setMails([]);
 }
 } catch (err) {
 console.error("Error fetching mails:", err);
 setMails([]);
 }
 };

 loadData();
 window.addEventListener("storage", loadData);
 return () => window.removeEventListener("storage", loadData);
 }, [triggerToast]);

 useEffect(() => {
 if (currentPage !== 1) {
 requestAnimationFrame(() => setCurrentPage(1));
 }
 }, [searchTerm, statusFilter, assignmentFilter, dateFilter, selectedBatch, selectedBatchFilter, type, currentPage]);

 useEffect(() => {
 requestAnimationFrame(() => setSelectedBatchFilter("ALL"));
 }, [type]);

 const availableBatches = useMemo(() => {
 const scannedNames = new Set(
 (mails || []).filter(m => (type ==="ALL" || m.type === type) && m.batchName).map(m => m.batchName)
 );
 return Array.from(scannedNames).map(name => ({ id: name as string, name: name as string }));
 }, [mails, type]);

 const copyToClipboard = (text: string, label: string) => {
 if (!text) return;
 navigator.clipboard.writeText(text);
 triggerToast(`Đã sao chép ${label}`);
 };

 const handleWorkStatusChange = async (identifier: string | number, newStatus: string) => {
 const now = new Date().toISOString();
 let updatedMail: MailData | null = null;
 
 // Validation: Require 3 links for SATELLITE mails if marking as"Đã làm"
 const targetMail = mails.find(m => m._id === identifier || m.id === identifier);
 if (newStatus ==="Đã làm" && targetMail?.type ==="SATELLITE") {
 const links = targetMail.links || [];
 const filledCount = [0, 1, 2].filter(i => links[i] && links[i].trim() !=="").length;
 if (filledCount < 3) {
 alert("Vui lòng điền đủ 3 link kênh trước khi chuyển trạng thái Đã làm");
 return;
 }
 }

 const updated = (mails || []).map(m => {
 if (m._id === identifier || m.id === identifier) {
 let status = m.status;
 if (newStatus ==="Đã làm" || newStatus ==="Đã bán" || newStatus ==="Chưa làm") {
 status ="LIVE";
 } else if (newStatus ==="Lỗi") {
 status ="DIE";
 }
 updatedMail = {
 ...m,
 workStatus: newStatus,
 status,
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name || user?.username ||"Hệ thống"
 };
 return updatedMail;
 }
 return m;
 });
 if (!updatedMail || typeof identifier !== 'string' || identifier.length <= 10) {
 setMails(updated);
 triggerToast("Đã cập nhật trạng thái công việc! (Chỉ trên giao diện)");
 return;
 }

 const mailToSave: MailData = updatedMail!;

 try {
 const res = await fetch(`/api/admin/mails/${identifier}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 workStatus: mailToSave.workStatus,
 status: mailToSave.status,
 lastUpdated: mailToSave.lastUpdated,
 updatedAt: mailToSave.updatedAt,
 updatedBy: mailToSave.updatedBy
 })
 });

 if (res.ok) {
 setMails(updated);
 triggerToast("Đã cập nhật trạng thái công việc thành công!");
 } else {
 const errorData = await res.json();
 triggerToast(`Lỗi: ${errorData.error || 'Không thể cập nhật'}`);
 }
 } catch (err) {
 console.error("Lỗi khi update workStatus lên DB:", err);
 triggerToast("Đã xảy ra lỗi hệ thống khi lưu.");
 }
 };

 const handleSaveUnifiedDetails = async (identifier: string | number, updatedFields: Partial<MailData>) => {
 const now = new Date().toISOString();
 let updatedMail: MailData | null = null;
 const fieldsToSave = { ...updatedFields } as Partial<MailData>;

 const updated = (mails || []).map((m) => {
 if (m._id === identifier || m.id === identifier) {
 if (fieldsToSave.verificationStatus) {
 const vs = fieldsToSave.verificationStatus;
 if (vs ==="Mail veri" || vs?.startsWith("Quét CCCD")) {
 fieldsToSave.status ="DIE";
 } else {
 fieldsToSave.status ="LIVE";
 }
 }
 
 updatedMail = {
 ...m,
 ...fieldsToSave,
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name || user?.username ||"Hệ thống"
 };
 return updatedMail;
 }
 return m;
 });
 if (!updatedMail || typeof identifier !== 'string' || identifier.length <= 10) {
 setMails(updated);
 triggerToast("Đã cập nhật chi tiết thành công! (Chỉ trên giao diện)");
 return;
 }

 try {
 const res = await fetch(`/api/admin/mails/${identifier}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(fieldsToSave)
 });

 if (res.ok) {
 setMails(updated);
 triggerToast("Đã cập nhật chi tiết thành công!");
 } else {
 const errorData = await res.json();
 triggerToast(`Lỗi: ${errorData.error || 'Không thể cập nhật'}`);
 }
 } catch (err) {
 console.error("Lỗi khi update detail lên DB:", err);
 triggerToast("Đã xảy ra lỗi hệ thống khi lưu.");
 }
 };

 const getStatusSelectStyle = (status: string) => {
 const val = (status ||"").toLowerCase().trim();
 if (val.startsWith("đã") || val.startsWith("hoàn thành")) {
 return"bg-green-500/10 text-green-500 border-green-500/20";
 }
 if (val ==="lỗi" || val ==="die" || val ==="mail veri" || val.startsWith("quét cccd")) {
 return"bg-red-500/10 text-red-500 border-red-500/20";
 }
 return"bg-amber-500/10 text-amber-500 border-amber-500/20";
 };

 const deleteMail = (identifier: string | number) => {
 setConfirmConfig({
 title:"Xác nhận xóa",
 msg:"Bạn có chắc chắn muốn xóa mail này?",
 onConfirm: async () => {
 try {
 // Delete from MongoDB if it has a MongoDB ID
 if (typeof identifier === 'string' && identifier.length > 10) {
 const res = await fetch(`/api/admin/mails/${identifier}`, {
 method: 'DELETE'
 });
 if (res.ok) {
 const finalMails = (mails || []).filter(m => String(m._id) !== String(identifier) && String(m.id) !== String(identifier));
 setMails(finalMails);
 setShowConfirm(false);
 triggerToast("Đã xóa mail thành công!");
 } else {
 const errorData = await res.json();
 triggerToast(`Lỗi: ${errorData.error || 'Không thể xóa'}`);
 setShowConfirm(false);
 }
 } else {
 // It's a local mock mail, just delete it
 const finalMails = (mails || []).filter(m => String(m._id) !== String(identifier) && String(m.id) !== String(identifier));
 setMails(finalMails);
 setShowConfirm(false);
 triggerToast("Đã xóa mail (local) thành công!");
 }
 } catch (err) {
 console.error("Lỗi xóa mail:", err);
 triggerToast("Lỗi khi xóa mail!");
 setShowConfirm(false);
 }
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
 const wb = XLSX.read(bstr, { type:"binary" });
 const ws = wb.Sheets[wb.SheetNames[0]];
 const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

 if ((rawRows || []).length === 0) {
 triggerToast("Không tìm thấy dữ liệu mail hợp lệ!");
 return;
 }

 let startIndex = 0;
 const firstRow = rawRows[0] || [];
 const firstCellStr = String(firstRow[0] ||"").toLowerCase().trim();

 // Detect if first row is a header row
 const hasAt = firstCellStr.includes("@");
 const isHeaderRow = !hasAt && (
 firstCellStr ==="mail" || 
 firstCellStr ==="email" || 
 firstCellStr.includes("tài khoản") || 
 firstCellStr.includes("tai khoan") || 
 firstCellStr ==="tk" ||
 firstCellStr ==="stt" ||
 firstRow.some(cell => {
 const s = String(cell ||"").toLowerCase().trim();
 return s ==="pass" || s ==="recovery" || s ==="2fa" || s ==="sđt" || s ==="sdt" || s ==="link otp" || s ==="link sđt" || s ==="stt";
 }));

 let emailIdx = 0;
 let passIdx = 1;
 let recoveryIdx = 2;
 let twoFAIdx = 3;
 let phoneIdx = 4;
 let otpLinkIdx = 5;
 let sttIdx = -1;

 if (isHeaderRow) {
 firstRow.forEach((cell, idx) => {
 const s = String(cell ||"").trim().toUpperCase()
 .replace(/\s+/g, ' ')
 .replace(/[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơư]/g, (c) => {
 const map: Record<string, string> = {
 'Đ': 'D', 'đ': 'd',
 'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'È': 'E', 'É': 'E', 'Ê': 'E',
 'Ì': 'I', 'Í': 'I', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ù': 'U',
 'Ú': 'U', 'Ă': 'A', 'Ĩ': 'I', 'Ũ': 'U', 'Ơ': 'O',
 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'è': 'e', 'é': 'e', 'ê': 'e',
 'ì': 'i', 'í': 'i', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ù': 'u',
 'ú': 'u', 'ă': 'a', 'ĩ': 'i', 'ũ': 'u', 'ơ': 'o'
 };
 return map[c] || c;
 });
 
 if (s.includes("MAIL") || s.includes("EMAIL") || s.includes("TAI KHOAN") || s.includes("TK")) {
 if (!s.includes("KP") && !s.includes("KHOI PHUC")) {
 emailIdx = idx;
 } else {
 recoveryIdx = idx;
 }
 } else if (s.includes("PASS") || s.includes("PASSWORD") || s.includes("MAT KHAU") || s.includes("MK")) {
 passIdx = idx;
 } else if (s.includes("RECOVERY") || s.includes("MAIL KP") || s.includes("MAIL KHOI PHUC") || s.includes("EMAIL KP") || s.includes("EMAIL KHOI PHUC")) {
 recoveryIdx = idx;
 } else if (s.includes("2FA") || s.includes("TWOFA") || s.includes("MA 2FA") || s.includes("SECRET KEY")) {
 twoFAIdx = idx;
 } else if (s.includes("SDT") || s.includes("PHONE") || s.includes("SO DIEN THOAI") || s.includes("TELEPHONE")) {
 phoneIdx = idx;
 } else if (s.includes("LINK OTP") || s.includes("LINK SDT") || s.includes("OTPLINK") || s.includes("MO OTP")) {
 otpLinkIdx = idx;
 } else if (s ==="STT" || s ==="SO THU TU") {
 sttIdx = idx;
 }
 });
 startIndex = 1;
 } else {
 // If headerless, auto scan first row's cell contents to align columns
 firstRow.forEach((cell, idx) => {
 const val = String(cell ||"").trim();
 if (val.includes("@")) {
 if (emailIdx === 0 && idx === 0) {
 emailIdx = idx;
 } else {
 recoveryIdx = idx;
 }
 } else if (val.startsWith("http") || val.includes("?token=")) {
 otpLinkIdx = idx;
 } else if (/^[0-9]+$/.test(val) && (val || []).length >= 8) {
 phoneIdx = idx;
 } else if ((val || []).length >= 30 && /^[a-z0-9]+$/i.test(val)) {
 twoFAIdx = idx;
 }
 });
 startIndex = 0;
 }

 // Determine starting ID based on offset rules:
 // ROOT: starts at 1
 // SATELLITE: starts at 1001
 // MONETIZED: starts at 2001
 let startId = 1;
 const targetType = (type ==="ALL" ?"SATELLITE" : type) as"ROOT" |"SATELLITE" |"MONETIZED";
 if (targetType ==="ROOT") {
 const rootMails = (mails || []).filter(m => m.type ==="ROOT");
 const maxId = rootMails.reduce((max, m) => {
 const current = m.stt || m.id || 0;
 return current > max ? current : max;
 }, 0);
 startId = maxId > 0 ? maxId + 1 : 1;
 } else if (targetType ==="SATELLITE") {
 const satMails = (mails || []).filter(m => m.type ==="SATELLITE");
 const maxId = satMails.reduce((max, m) => {
 const current = m.stt || m.id || 1000;
 return current > max ? current : max;
 }, 1000);
 startId = maxId > 1000 ? maxId + 1 : 1001;
 } else if (targetType ==="MONETIZED") {
 const monMails = (mails || []).filter(m => m.type ==="MONETIZED");
 const maxId = monMails.reduce((max, m) => {
 const current = m.stt || m.id || 2000;
 return current > max ? current : max;
 }, 2000);
 startId = maxId > 2000 ? maxId + 1 : 2001;
 }

 const importedMails: MailData[] = [];
 let importedCount = 0;
 let duplicateCount = 0;
 for (let r = startIndex; r < (rawRows || []).length; r++) {
 const row = rawRows[r];
 if (!row || (row || []).length === 0) continue;
 const email = String(row[emailIdx] ||"").trim();
 if (!email) continue;

 const isDuplicate = importedMails.some(im => im.email.toLowerCase() === email.toLowerCase()) ||
 mails.some(m => m.email.toLowerCase() === email.toLowerCase());

 if (isDuplicate) {
 duplicateCount++;
 continue;
 }

 importedMails.push({
 id: startId + importedCount,
 stt: sttIdx !== -1 && row[sttIdx] ? Number(row[sttIdx]) : (startId + importedCount),
 email,
 pass: String(row[passIdx] ||"").trim(),
 recovery: String(row[recoveryIdx] ||"").trim(),
 twoFA: String(row[twoFAIdx] ||"").trim(),
 phone: String(row[phoneIdx] ||"").trim(),
 otpLink: String(row[otpLinkIdx] ||"").trim(),
 type: targetType,
 status:"LIVE" as const,
 workStatus: targetType ==="ROOT" ? undefined : (targetType ==="MONETIZED" ?"Chưa bán" :"Chưa làm"),
 verificationStatus: targetType ==="ROOT" ?"Chưa xanh" : undefined,
 cccdDate: targetType ==="ROOT" ?"" : undefined,
 createdAt: new Date().toISOString().split("T")[0]
 });
 importedCount++;
 }

 if ((importedMails || []).length === 0) {
 if (duplicateCount > 0) {
 triggerToast(`Bỏ qua tất cả ${duplicateCount} mail do bị trùng lặp!`);
 } else {
 triggerToast("Không tìm thấy dữ liệu mail hợp lệ!");
 }
 return;
 }

 if (duplicateCount > 0) {
 triggerToast(`Đã bỏ qua ${duplicateCount} mail bị trùng!`);
 }
 setPendingMails(importedMails);
 setImportBatchName("");
 setShowBatchNameModal(true);
 } catch (err) {
 console.error("Import Error:", err);
 triggerToast("Lỗi xử lý dữ liệu file Excel!");
 }
 };
 reader.readAsBinaryString(file);
 e.target.value ="";
 };

 const handleManualImport = () => {
 if (!manualData.trim()) return;
 const lines = manualData.split("\n");

 let startId = 1;
 const targetType = (type ==="ALL" ?"SATELLITE" : type) as"ROOT" |"SATELLITE" |"MONETIZED";
 if (targetType ==="ROOT") {
 const rootMails = (mails || []).filter(m => m.type ==="ROOT");
 const maxId = rootMails.reduce((max, m) => m.id > max ? m.id : max, 0);
 startId = maxId > 0 ? maxId + 1 : 1;
 } else if (targetType ==="SATELLITE") {
 const satMails = (mails || []).filter(m => m.type ==="SATELLITE");
 const maxId = satMails.reduce((max, m) => m.id > max ? m.id : max, 1000);
 startId = maxId > 1000 ? maxId + 1 : 1001;
 } else if (targetType ==="MONETIZED") {
 const monMails = (mails || []).filter(m => m.type ==="MONETIZED");
 const maxId = monMails.reduce((max, m) => m.id > max ? m.id : max, 2000);
 startId = maxId > 2000 ? maxId + 1 : 2001;
 }

 const newItems: MailData[] = [];
 let importedCount = 0;
 let duplicateCount = 0;

 (lines || []).filter(l => l.trim()).forEach((line) => {
 const parts = line.split(/[\t|]|\s{2,}/);
 const email = String(parts[0] ||"").trim();
 if (!email) return;

 const isDuplicate = newItems.some(ni => ni.email.toLowerCase() === email.toLowerCase()) ||
 mails.some(m => m.email.toLowerCase() === email.toLowerCase());

 if (isDuplicate) {
 duplicateCount++;
 return;
 }

 newItems.push({
 id: startId + importedCount,
 email,
 pass: String(parts[1] ||"").trim(),
 recovery: String(parts[2] ||"").trim(),
 twoFA: String(parts[3] ||"").trim(),
 phone: String(parts[4] ||"").trim(),
 otpLink: String(parts[5] ||"").trim(),
 type: targetType,
 status:"LIVE" as const,
 workStatus: (targetType ==="MONETIZED" ?"Chưa bán" :"Chưa làm"),
 createdAt: new Date().toISOString().split("T")[0]
 });
 importedCount++;
 });

 if ((newItems || []).length === 0) {
 if (duplicateCount > 0) {
 triggerToast(`Bỏ qua tất cả ${duplicateCount} mail thủ công do trùng lặp!`);
 } else {
 triggerToast("Không có dữ liệu hợp lệ!");
 }
 return;
 }

 if (duplicateCount > 0) {
 triggerToast(`Đã bỏ qua ${duplicateCount} mail bị trùng!`);
 }
 setPendingMails(newItems);
 setImportBatchName("");
 setShowBatchNameModal(true);
 setManualData("");
 setShowManualImport(false);
 };

 const handleConfirmBatchImport = async () => {
 if (!pendingMails || (pendingMails || []).length === 0) return;
 const batchNameInput = importBatchName.trim() || `Lô ngày ${new Date().toLocaleDateString("vi-VN")}`;
 const batchId = `batch-${Date.now()}`;

 const mappedMails = (pendingMails || []).map(m => ({
 ...m,
 batchId,
 batchName: batchNameInput
 }));



 try {
 triggerToast(`Đang lưu ${(mappedMails || []).length} mail vào Lô"${batchNameInput}" trên Server...`);
 // 1. Send all new mails to the database
 const res = await fetch("/api/admin/mails", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(mappedMails)
 });
 
 if (!res.ok) {
 const errorData = await res.json();
 throw new Error(errorData.error ||"Lỗi lưu dữ liệu");
 }
 
 const data = await res.json();
 if (!data.success) {
 throw new Error(data.error ||"Lỗi lưu dữ liệu");
 }

 setPendingMails(null);
 setImportBatchName("");
 setShowBatchNameModal(false);
 triggerToast(`Đã lưu thành công ${(mappedMails || []).length} mail vào Lô"${batchNameInput}"!`);

 // TRIGGER RELOAD AFTER POST COMPLETE
 window.dispatchEvent(new Event("storage"));
 } catch (err: unknown) {
 console.error("Lỗi khi gọi API POST mails:", err);
 // Giữ nguyên modal (không gọi setShowBatchNameModal(false))
 if (err instanceof Error) {
 triggerToast(`Lỗi kết nối Server: ${err.message}`);
 } else {
 triggerToast(`Lỗi kết nối Server: Không thể lưu mail!`);
 }
 }
 };

 const handleExport = () => {
 const data = (filteredMails || []).map((m, i) => ({"STT": i + 1,"Email": m.email,"Mail KP": m.recovery,"Pass": m.pass,"2FA": m.twoFA,"SĐT": m.phone,"Link SĐT": m.otpLink
 }));
 const ws = XLSX.utils.json_to_sheet(data);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws,"Danh_Sach");
 XLSX.writeFile(wb, `AQ_MEDIA_${type}.xlsx`);
 triggerToast("Đã xuất Excel thành công!");
 };

 const filteredMails: (MailData & { originalSTT: number })[] = (mails || [])
 .filter((m) => type ==="ALL" || m.type === type)
 .map((m: MailData) => {
 const globalSTT = m.type ==="ROOT" ? m.id 
 : m.type ==="SATELLITE" ? m.id - 1000 
 : m.id - 2000;
 return {
 ...m,
 originalSTT: globalSTT
 };
 })
 .filter((m: MailData & { originalSTT: number }) => {
 if (isStaff && type ==="SATELLITE") {
 if (String(m.assigneeId) !== String(user?.id)) return false;
 if (selectedBatch && m.batchId !== selectedBatch && m.batchName !== selectedBatch) return false;
 }

 // Lọc theo Lô
 if (selectedBatchFilter !=="ALL") {
 if (m.batchId !== selectedBatchFilter && m.batchName !== selectedBatchFilter) {
 return false;
 }
 }

 const term = searchTerm.toLowerCase().trim();
 const matchesSearch = m.email.toLowerCase().includes(term) ||
 m.recovery.toLowerCase().includes(term) ||
 m.pass.toLowerCase().includes(term) ||
 (m.phone?.toLowerCase() ||"").includes(term);

 let matchesStatus = true;
 if (statusFilter !=="ALL") {
 if (type ==="ROOT") {
 const val = m.verificationStatus ||"Chưa xanh";
 matchesStatus = String(val).toLowerCase() === statusFilter.toLowerCase();
 } else if (type ==="MONETIZED") {
 const val = m.workStatus ||"Chưa bán";
 matchesStatus = String(val).toLowerCase() === statusFilter.toLowerCase();
 } else {
 const val = m.workStatus ||"Chưa làm";
 matchesStatus = String(val).toLowerCase() === statusFilter.toLowerCase();
 }
 }

 let matchesDate = true;
 if (dateFilter !=="ALL") {
 const isWithinTimeRange = (dateStr: string | undefined, filterType:"1_WEEK" |"1_MONTH" |"2_MONTH") => {
 if (!dateStr) return false;
 try {
 const today = new Date("2026-05-18");
 const targetDate = new Date(dateStr);
 const diffTime = today.getTime() - targetDate.getTime();
 const diffDays = diffTime / (1000 * 60 * 60 * 24);
 
 if (diffDays < 0) return true;
 
 let limitDays = 30;
 if (filterType ==="1_WEEK") limitDays = 7;
 else if (filterType ==="1_MONTH") limitDays = 30;
 else if (filterType ==="2_MONTH") limitDays = 60;
 
 return diffDays <= limitDays;
 } catch {
 return false;
 }
 };

 const dateToFilter = (type ==="ROOT" && m.verificationStatus ==="Quét CCCD")
 ? m.cccdDate
 : (m.updatedAt || m.createdAt);

 matchesDate = isWithinTimeRange(dateToFilter, dateFilter);
 }

 let matchesAssignment = true;
 if (isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && assignmentFilter !=="ALL") {
 if (assignmentFilter ==="ASSIGNED") {
 matchesAssignment = !!m.assigneeId;
 } else if (assignmentFilter ==="UNASSIGNED") {
 matchesAssignment = !m.assigneeId;
 }
 }

 return matchesSearch && matchesStatus && matchesDate && matchesAssignment;
 })
 .sort((a: MailData & { originalSTT: number }, b: MailData & { originalSTT: number }) => {
 const aStt = a.stt || a.id || 0;
 const bStt = b.stt || b.id || 0;
 return aStt - bStt;
 });

 const staffStats = useMemo(() => {
 const myMails = (mails || []).filter(m => String(m.assigneeId) === String(user?.id) && m.type ==="SATELLITE");
 return {
 totalAssigned: (myMails || []).length,
 doneChannel: (myMails || []).filter(m => (m.workStatus as string) ==="Đã làm").length,
 failed: (myMails || []).filter(m => (m.workStatus as string) ==="Lỗi").length,
 };
 }, [mails, user]);

 const totalPages = isStaff && type ==="SATELLITE" ? 1 : Math.ceil((filteredMails || []).length / itemsPerPage);
 const currentItems = isStaff && type ==="SATELLITE" ? filteredMails : filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 const staffBatches = useMemo(() => {
 if (!isStaff || type !=="SATELLITE") return [];
 const mySats = (mails || []).filter(m => String(m.assigneeId) === String(user?.id) && m.type ==="SATELLITE");
 const counts: Record<string, { id: string; name: string; count: number }> = {};
 mySats.forEach(m => {
 const key = m.batchId || m.batchName ||"Lô chưa phân loại";
 if (!counts[key]) {
 counts[key] = { id: key, name: m.batchName ||"Lô chưa phân loại", count: 0 };
 }
 counts[key].count++;
 });
 return Object.values(counts).sort((a, b) => {
 const numA = parseInt(a.name.replace(/\D/g,"")) || 999;
 const numB = parseInt(b.name.replace(/\D/g,"")) || 999;
 return numA - numB;
 });
 }, [mails, user, isStaff, type]);

 return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative">
 <AnimatePresence>
 {showToast && (
 <motion.div initial={{ opacity: 0, y: -20, x:"-50%" }} animate={{ opacity: 1, y: 30, x:"-50%" }} exit={{ opacity: 0, y: -20, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-2 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2"
 >
 <CheckCircle size={18} /> {toastMsg}
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showConfirm && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] bg-white/90 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-900 border border-white/10 rounded-[40px] p-10 w-full max-w-md shadow-2xl text-center">
 <div className="mx-auto h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-inner">
 <AlertTriangle size={40} />
 </div>
 <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{confirmConfig.title}</h3>
 <p className="text-gray-400 font-medium mb-8 leading-relaxed">{confirmConfig.msg}</p>
 <div className="flex gap-4">
 <button onClick={() => setShowConfirm(false)} className="flex-1 h-12 rounded-2xl border border-white/10 text-white font-bold uppercase text-sm tracking-widest hover:bg-white bg-zinc-900/5 transition-all">Hủy bỏ</button>
 <button onClick={confirmConfig.onConfirm} className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-black uppercase text-sm tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Xác nhận Xóa</button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showManualImport && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-white/90 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-900 border border-white/10 rounded-[40px] p-10 w-full max-w-2xl shadow-2xl">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><PlusCircle className="text-gold" size={32} /> Import Thủ Công</h3>
 <button onClick={() => setShowManualImport(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-gray-900 text-white transition-colors"><X /></button>
 </div>
 <p className="text-[10px] text-gray-500 mb-6 font-black uppercase tracking-widest leading-relaxed opacity-60">
 Định dạng: Email [Tab/Cách] Pass [Tab/Cách] Mail KP [Tab/Cách] 2FA [Tab/Cách] SĐT [Tab/Cách] Link OTP
 </p>
 <textarea
 value={manualData} onChange={(e) => setManualData(e.target.value)}
 className="w-full h-72 bg-black/30 border border-white/10 rounded-3xl p-6 text-base text-white focus:border-gold outline-none transition-all resize-none font-mono scrollbar-hide"
 placeholder="Dán dữ liệu của bạn vào đây..."
 />
 <div className="flex gap-4 mt-8">
 <button onClick={() => setShowManualImport(false)} className="flex-1 h-14 rounded-2xl border border-white/10 text-white font-bold uppercase text-sm tracking-widest hover:bg-white bg-zinc-900/5 transition-all">Hủy bỏ</button>
 <button onClick={handleManualImport} className="flex-1 h-14 rounded-2xl bg-gold text-sidebar font-black uppercase text-sm tracking-widest hover:bg-gold/80 transition-all shadow-xl shadow-gold/20">Xác nhận Thêm</button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showHistoryModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="bg-gray-900 border border-white/10 rounded-[40px] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
 >
 {/* Header */}
 <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
 <FileText className="text-gold" size={20} />
 </div>
 <div>
 <h3 className="text-xl font-black text-white uppercase tracking-tight">LỊCH SỬ IMPORT HỆ THỐNG</h3>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Nhật ký danh sách nhập dữ liệu</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {(importHistory || []).length > 0 && (
 <button
 onClick={handleClearAllHistory}
 className="h-9 px-3.5 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
 >
 <Trash2 size={13} /> Xóa tất cả
 </button>
 )}
 <button
 onClick={() => setShowHistoryModal(false)}
 className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-gray-900 text-white transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="flex items-center gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
 {(["ALL","MAIL","SĐT"] as Array<"ALL" |"MAIL" |"SĐT">).map((tab) => (
 <button
 key={tab}
 onClick={() => setHistoryTab(tab)}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 historyTab === tab
 ?"bg-gold text-sidebar shadow-md"
 :" text-gray-400 hover:text-gray-900 text-white"
 }`}
 >
 {tab ==="ALL" ?"Tất cả" : tab}
 </button>
 ))}
 </div>

 {/* List Content */}
 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 scrollbar-hide">
 {(filteredHistory || []).length === 0 ? (
 <div className="py-16 text-center">
 <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
 <FileText className="" size={28} />
 </div>
 <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Không có lịch sử nhập dữ liệu</p>
 <p className="text-[10px] mt-1">Các lượt import mới sẽ tự động được ghi nhận tại đây.</p>
 </div>
 ) : (
 (filteredHistory || []).map((item: ImportHistoryItem) => (
 <div
 key={item.id}
 className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-center justify-between hover:border-gray-300 hover:border-white/10 transition-all group"
 >
 <div className="flex items-center gap-4">
 {/* Icon / Badge */}
 <div
 className={`h-11 w-11 rounded-xl flex items-center justify-center border font-mono text-[10px] font-black tracking-widest ${
 item.type ==="MAIL"
 ?"bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
 :"bg-gold/10 text-gold border-gold/20"
 }`}
 >
 {item.type}
 </div>
 
 {/* Details */}
 <div className="space-y-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-sm font-black text-white font-mono break-all">{item.fileName}</span>
 <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-md font-black">
 +{item.quantity} {item.type ==="MAIL" ?"mail" :"số"}
 </span>
 </div>
 
 <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
 <span className="flex items-center gap-1">
 <Calendar size={12} className="" />
 {item.importedAt}
 </span>
 <span className="flex items-center gap-1">
 <UserIcon size={12} className="" />
 Người nhập: <strong className="text-gray-400">{item.importedBy}</strong>
 </span>
 </div>
 </div>
 </div>

 {/* Delete Individual Row */}
 <button
 onClick={() => handleDeleteHistoryRow(item.id)}
 className="h-8 w-8 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-red-500/0 hover:border-red-500/20"
 title="Xóa dòng lịch sử này"
 >
 <Trash2 size={14} />
 </button>
 </div>
 ))
 )}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {(!isStaff || !selectedBatch) && (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-6">
 <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-gold hover:text-gray-900 text-white font-black uppercase text-sm tracking-widest transition-all group">
 <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-all shadow-lg"><ArrowLeft size={20} /></div>
 Quay lại bảng điều khiển
 </button>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <Mail className="text-gold" size={28} />
 Danh sách {type ==="ALL" ?"Tất cả" : type ==="ROOT" ?"Mail Gốc" : type ==="SATELLITE" ?"Mail Vệ Tinh" :"Mail Bật Kiếm Tiền"}
 </h2>
 </div>
 <div className="flex items-center gap-3">

 {isAdminOrManager && (
 <>
 <button onClick={() => setShowHistoryModal(true)} className="h-10 px-4 bg-white/5 border border-white/10 hover:border-gold/50 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><FileText size={14} className="text-gold" /> Lịch sử Import</button>
 <button onClick={() => setShowManualImport(true)} className="h-10 px-4 bg-white/5 border border-white/10 hover:border-gold/50 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><PlusCircle size={14} className="text-gold" /> Thêm thủ công</button>
 <label className="h-10 px-4 bg-white/5 border border-white/10 hover:border-gold/50 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"><Upload size={14} className="text-gold" /> Import Excel / CSV <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} /></label>
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

 {isStaff && type ==="SATELLITE" && !selectedBatch ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
 {(staffBatches || []).map((batch) => (
 <button
 key={batch.id}
 onClick={() => setSelectedBatch(batch.id)}
 className="bg-sidebar border border-white/10 hover:border-gold/50 p-6 rounded-[24px] text-left transition-all group shadow-xl hover:shadow-gold/10"
 >
 <div className="flex items-center justify-between mb-4">
 <div className="h-12 w-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 group-hover:scale-110 transition-transform">
 <Database size={24} />
 </div>
 <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-black/40 px-3 py-1 rounded-full">
 {batch.count} mail
 </span>
 </div>
 <h3 className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-gold transition-colors">{batch.name}</h3>
 <p className="text-sm text-gray-500 mt-2 font-medium">Bấm vào để xem và xử lý các mail trong lô này.</p>
 </button>
 ))}
 </div>
 ) : (
 <div className={` bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex flex-col ${selectedBatch
 ?"h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] lg:h-[calc(100vh-160px)]"
 :"h-[calc(100vh-220px)] md:h-[calc(100vh-240px)] lg:h-[calc(100vh-260px)]"
 }`}>
 <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col xl:flex-row items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
 {isStaff && type ==="SATELLITE" && selectedBatch && (
 <button
 onClick={() => setSelectedBatch(null)}
 className="h-10 px-4 flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-black text-sm uppercase tracking-widest transition-all"
 >
 <ArrowLeft size={16} /> Quay lại
 </button>
 )}
 <h3 className="text-xl font-black text-white uppercase tracking-tighter shrink-0">Dữ liệu chi tiết {selectedBatch ? `- Lô mail` :""}</h3>
 <div className="h-8 w-px bg-white/10 hidden md:block" />
 <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 h-10 w-full md:w-64 lg:w-80 focus-within:border-gold transition-all">
 <Search size={16} className="text-gray-500 shrink-0" />
 <input type="text" placeholder="Tìm kiếm Email, Pass, Mail KP, SĐT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white w-full" />
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-sidebar text-white">Tất cả trạng thái</option>
 {type ==="ROOT" ? (
 <>
 <option value="Mail veri" className="bg-sidebar text-white">Mail veri</option>
 <option value="Đã xanh" className="bg-sidebar text-white">Đã xanh</option>
 <option value="Chưa xanh" className="bg-sidebar text-white">Chưa xanh</option>
 <option value="Quét CCCD" className="bg-sidebar text-white">Quét CCCD</option>
 </>
 ) : type ==="MONETIZED" ? (
 <>
 <option value="Đã bán" className="bg-sidebar text-white">Đã bán</option>
 <option value="Chưa bán" className="bg-sidebar text-white">Chưa bán</option>
 </>
 ) : (
 <>
 <option value="Đang xử lí" className="bg-sidebar text-white">Đang xử lí</option>
 <option value="Đã làm" className="bg-sidebar text-white">Đã làm</option>
 <option value="Chưa làm" className="bg-sidebar text-white">Chưa làm</option>
 <option value="Lỗi" className="bg-sidebar text-white">Lỗi</option>
 </>
 )}
 </select>
 {isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <select
 value={assignmentFilter}
 onChange={(e) => setAssignmentFilter(e.target.value as"ALL" |"ASSIGNED" |"UNASSIGNED")}
 className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
 >
 <option value="ALL" className="bg-sidebar text-white">Trạng thái gán</option>
 <option value="ASSIGNED" className="bg-sidebar text-white">Đã gán</option>
 <option value="UNASSIGNED" className="bg-sidebar text-white">Chưa gán</option>
 </select>
 )}
 {(type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <select
 value={selectedBatchFilter}
 onChange={(e) => setSelectedBatchFilter(e.target.value)}
 className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
 >
 <option value="ALL" className="bg-sidebar text-white">Lọc theo Lô</option>
 {(availableBatches || []).map((b: { id: string; name: string }) => (
 <option key={b.id} value={b.id} className="bg-sidebar text-white">
 {b.name}
 </option>
 ))}
 </select>
 )}
 <select
 value={dateFilter}
 onChange={(e) => setDateFilter(e.target.value as"ALL" |"1_WEEK" |"1_MONTH" |"2_MONTH")}
 className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-sidebar text-white">Tất cả thời gian</option>
 <option value="1_WEEK" className="bg-sidebar text-white">1 tuần gần đây</option>
 <option value="1_MONTH" className="bg-sidebar text-white">1 tháng gần đây</option>
 <option value="2_MONTH" className="bg-sidebar text-white">2 tháng gần đây</option>
 </select>
 <div className="hidden xl:flex items-center gap-3 px-5 py-2 bg-gold/10 border-2 border-gold/20 rounded-2xl shadow-lg shadow-gold/5 group">
 <Mail size={18} className="text-gold animate-pulse" />
 <span className="text-base font-black text-white uppercase tracking-widest">
 Tổng cộng: <span className="text-gold text-base ml-1">{(filteredMails || []).length}</span> <span className="text-gold/60 text-[10px] ml-1">Mail</span>
 </span>
 </div>
 </div>
 <button onClick={() => router.push("/admin")} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-all"><X size={20} /></button>
 </div>

 <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
 <div className="min-w-[1200px]">
 <table className="w-full text-left text-base whitespace-nowrap">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
 <tr>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">STT</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Email</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Mail KP</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Pass</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">2FA</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">SĐT</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Link SĐT</th>
 {isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Quản lý</th>
 )}
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Trạng thái</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Thao tác</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(currentItems || []).length > 0 ? (currentItems || []).map((mail: MailData & { originalSTT: number }, index: number) => {
 const rowPadding = isStaff ?"py-1.5 px-6" :"py-3.5 px-6";
 const textSize = isStaff ?"text-sm" :"text-base";
 return (
 <tr key={mail._id || mail.id || index} className="hover:bg-white bg-zinc-900/[0.02] transition-colors group">
 <td className={`${rowPadding} text-[10px] font-black text-gray-500 whitespace-nowrap`}>{mail.stt || mail.originalSTT}</td>
 <td className={`${rowPadding} cursor-pointer hover:text-gold transition-colors font-bold ${textSize} whitespace-nowrap`} onClick={() => copyToClipboard(mail.email,"Email")}>
 {mail.type ==="SATELLITE" && (() => {
 const linksCount = (mail.links || []).filter((l: string) => typeof l === 'string' && l.trim() !=="").length;
 const missingCount = 3 - linksCount;
 if (missingCount > 0) {
 return (
 <div className="mb-1">
 <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg animate-pulse inline-flex items-center gap-1">
 ⚠️ Thiếu {missingCount} kênh
 </span>
 </div>
 );
 }
 return null;
 })()}
 {mail.email}
 </td>
 <td className={`${rowPadding} cursor-pointer text-sm text-gray-400 hover:text-gold transition-colors whitespace-nowrap`} onClick={() => copyToClipboard(mail.recoveryMail || mail.recovery,"Mail KP")}>{mail.recoveryMail || mail.recovery}</td>
 <td className={`${rowPadding} cursor-pointer text-sm text-gray-500 hover:text-gold transition-colors font-mono whitespace-nowrap`} onClick={() => copyToClipboard(mail.password || mail.pass,"Mật khẩu")}>{mail.password || mail.pass}</td>
 {/* 2FA - TOTP real-time */}
 <td className={`${rowPadding} whitespace-nowrap`}>
 {mail.twoFA ? (
 <TOTPDisplay secret={mail.twoFA} compact onCopy={copyToClipboard} />
 ) : (
 <span className="">---</span>
 )}
 </td>
 {/* SĐT - click to copy */}
 <td className={`${rowPadding} whitespace-nowrap`}>
 {mail.phone ? (
 <button
 onClick={() => copyToClipboard(mail.phone ||"","SĐT")}
 className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gold transition-colors font-bold group/sdt"
 >
 <Phone size={12} className="group-hover/sdt:text-gold" />
 {mail.phone}
 <Copy size={10} className="opacity-0 group-hover/sdt:opacity-100 transition-opacity" />
 </button>
 ) : (
 <span className="">---</span>
 )}
 </td>
 {/* Link OTP - click to open new tab */}
 <td className={`${rowPadding} whitespace-nowrap`}>
 {(mail.phoneLink || mail.otpLink) ? (
 <a
 href={mail.phoneLink || mail.otpLink}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-bold text-sm"
 >
 Mở OTP <ExternalLink size={12} />
 </a>
 ) : (
 <span className="">---</span>
 )}
 </td>
 {isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <td className={`${rowPadding} text-sm font-bold whitespace-nowrap`}>
 {mail.assigneeId ? (
 <span className="text-gold">
 {mail.assignedTo ||"Đã gán"}{mail.batchName ? ` - ${mail.batchName}` :""}
 </span>
 ) : (
 <span className="text-gray-500">Chưa gán</span>
 )}
 </td>
 )}
 <td className={`${rowPadding} text-center whitespace-nowrap`}>
 {type ==="ROOT" ? (
 <select
 value={mail.verificationStatus ||"Chưa xanh"}
 onChange={(e) => handleSaveUnifiedDetails(mail._id || mail.id, { verificationStatus: e.target.value })}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.verificationStatus ||"Chưa xanh")}`}
 >
 <option value="Mail veri" className="bg-sidebar text-white">Mail veri</option>
 <option value="Đã xanh" className="bg-sidebar text-white">Đã xanh</option>
 <option value="Chưa xanh" className="bg-sidebar text-white">Chưa xanh</option>
 <option value="Quét CCCD" className="bg-sidebar text-white">
 Quét CCCD {mail.cccdDate ? `(${mail.cccdDate})` :""}
 </option>
 </select>
 ) : type ==="MONETIZED" ? (
 <select
 value={mail.workStatus ||"Chưa bán"}
 onChange={(e) => handleWorkStatusChange(mail._id || mail.id, e.target.value)}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus ||"Chưa bán")}`}
 >
 <option value="Chưa bán" className="bg-sidebar text-white">Chưa bán</option>
 <option value="Đã bán" className="bg-sidebar text-white">Đã bán</option>
 </select>
 ) : (
 <select
 value={mail.workStatus ||"Chưa làm"}
 onChange={(e) => handleWorkStatusChange(mail._id || mail.id, e.target.value)}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus ||"Chưa làm")}`}
 >
 {isStaff && type ==="SATELLITE" ? (
 <>
 <option value="Chưa làm" className="bg-sidebar text-white">Chưa làm</option>
 <option value="Đã làm" className="bg-sidebar text-white">Đã làm</option>
 <option value="Lỗi" className="bg-sidebar text-white">Lỗi</option>
 </>
 ) : (
 <>
 <option value="Chưa làm" className="bg-sidebar text-white">Chưa làm</option>
 <option value="Đang xử lí" className="bg-sidebar text-white">Đang xử lí</option>
 <option value="Đã làm" className="bg-sidebar text-white">Đã làm</option>
 <option value="Lỗi" className="bg-sidebar text-white">Lỗi</option>
 </>
 )}
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
 <button onClick={() => deleteMail(mail._id || mail.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-gray-900 text-white transition-all shadow-inner"><Trash2 size={16} /></button>
 )}
 </div>
 </td>
 </tr>
 );
 }) : (
 <tr><td colSpan={isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") ? 10 : 9} className="py-20 text-center font-bold uppercase tracking-widest">Chưa có dữ liệu</td></tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {!(isStaff && type ==="SATELLITE") && (
 <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
 <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Trang <span className="text-white font-black">{currentPage}</span> / {totalPages || 1}</span>
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
 <MailDetailModal
 mail={selectedMailForConfig}
 type={selectedMailForConfig.type}
 user={user}
 onClose={() => setSelectedMailForConfig(null)}
 onSave={(updatedFields) => handleSaveUnifiedDetails(selectedMailForConfig.id, updatedFields)}
 />
 )}
 </AnimatePresence>

 {/* Modal Nhập Tên Lô Import */}
 <AnimatePresence>
 {showBatchNameModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-white/90 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="bg-gray-900 border border-border-custom rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
 >
 <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
 <h3 className="text-lg font-black text-white uppercase tracking-tighter">Đặt Tên Lô Cho Dữ Liệu Import</h3>
 <button
 onClick={() => {
 setPendingMails(null);
 setShowBatchNameModal(false);
 }}
 className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-gray-900 text-white transition-colors"
 >
 <X size={16} />
 </button>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-sm text-gray-400 font-medium leading-relaxed">
 Lô mail mới nhập sẽ được nhóm lại để thuận tiện quản lý công việc, theo dõi tiến độ và phân bổ cho nhân viên.
 </p>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Tên Lô Import</label>
 <input
 type="text"
 placeholder="VD: Lô 1 ngày 15/10"
 value={importBatchName}
 onChange={(e) => setImportBatchName(e.target.value)}
 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-gold transition-all"
 />
 </div>
 </div>
 <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3">
 <button
 onClick={() => {
 setPendingMails(null);
 setShowBatchNameModal(false);
 }}
 className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-gray-400 hover:text-gray-900 text-white transition-colors"
 >
 Hủy bỏ
 </button>
 <button
 onClick={handleConfirmBatchImport}
 className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-[#0a0a0a] text-sm font-black uppercase tracking-wider transition-all"
 >
 Xác nhận nạp
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
