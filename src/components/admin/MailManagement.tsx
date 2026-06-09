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

import { LoadingOverlay } from "@/components/ui/Loading";
import { useSWR } from "@/lib/useSWR";
import { ImportHistoryModal, type ImportHistoryItem } from "./modals/ImportHistoryModal";
import { ManualImportModal } from "./modals/ManualImportModal";
import { BatchNameModal } from "./modals/BatchNameModal";
import { StaffData } from "@/types/admin";

interface MailManagementProps {
 type:"ROOT" |"SATELLITE" |"MONETIZED" |"ALL";
 user: StaffData | null;
}

export default function MailManagement({ type, user }: MailManagementProps) {
 const router = useRouter();
 const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
 const [importBatchName, setImportBatchName] = useState("");

 const [mails, setMails] = useState<MailData[]>([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("ALL");
 const [dateFilter, setDateFilter] = useState<"ALL" |"1_WEEK" |"1_MONTH" |"2_MONTH">("ALL");
 const [assignmentFilter, setAssignmentFilter] = useState<"ALL" |"ASSIGNED" |"UNASSIGNED">("ALL");
 const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
 const [selectedBatchFilter, setSelectedBatchFilter] = useState("ALL");
 const [currentPage, setCurrentPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [totalCount, setTotalCount] = useState(0);
 const [batches, setBatches] = useState<string[]>([]);
 const [showToast, setShowToast] = useState(false);
 const [toastMsg, setToastMsg] = useState("");

 // Modals States
 const [showManualImport, setShowManualImport] = useState(false);
 const [showConfirm, setShowConfirm] = useState(false);
 const [confirmConfig, setConfirmConfig] = useState({ title:"", msg:"", onConfirm: () => { } });
 const [selectedMailForConfig, setSelectedMailForConfig] = useState<MailData | null>(null);

 const [pendingMails, setPendingMails] = useState<MailData[] | null>(null);
 const [showBatchNameModal, setShowBatchNameModal] = useState(false);
 const [showHistoryModal, setShowHistoryModal] = useState(false);
 const itemsPerPage = 15;

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

  const fetchMails = useCallback(async () => {
    const queryParams = new URLSearchParams();
    queryParams.set("type", type);
    queryParams.set("page", String(currentPage));
    queryParams.set("limit", String(itemsPerPage));

    if (searchTerm) queryParams.set("search", searchTerm);
    if (statusFilter && statusFilter !== "ALL") queryParams.set("status", statusFilter);
    if (selectedBatchFilter && selectedBatchFilter !== "ALL") queryParams.set("batch", selectedBatchFilter);

    if (assignmentFilter === "ASSIGNED") {
      queryParams.set("assigned", "true");
    } else if (assignmentFilter === "UNASSIGNED") {
      queryParams.set("assigned", "false");
    }

    if (isStaff && type === "SATELLITE" && user?.id) {
      queryParams.set("assigneeId", user.id);
    }

    const res = await fetch(`/api/admin/mails?${queryParams.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch");
    return data;
  }, [type, currentPage, searchTerm, statusFilter, selectedBatchFilter, assignmentFilter, isStaff, user]);

  const { data: apiData, mutate, isValidating } = useSWR(
    `mails-${type}-${currentPage}-${searchTerm}-${statusFilter}-${selectedBatchFilter}-${assignmentFilter}`,
    fetchMails,
    { refreshInterval: 30000 }
  );
  
  const isLoading = !apiData && isValidating;

  useEffect(() => {
    if (apiData?.success) {
      setMails(apiData.data || []);
      setTotalPages(apiData.pagination?.pages || 1);
      setTotalCount(apiData.pagination?.total || (apiData.data || []).length);
      if (apiData.batches) setBatches(apiData.batches);
    }
  }, [apiData]);

  useEffect(() => {
    window.addEventListener("storage", () => mutate());
    return () => window.removeEventListener("storage", () => mutate());
  }, [mutate]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, assignmentFilter, dateFilter, selectedBatch, selectedBatchFilter, type]);

 useEffect(() => {
 requestAnimationFrame(() => setSelectedBatchFilter("ALL"));
 }, [type]);

  const availableBatches = useMemo(() => {
    return (batches || []).map(name => ({ id: name, name }));
  }, [batches]);

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
 .replace(/[Ãƒâ‚¬ÃƒÂÃƒâ€šÃƒÆ’ÃƒË†Ãƒâ€°ÃƒÅ ÃƒÅ’ÃƒÂÃƒâ€™Ãƒâ€œÃƒâ€Ãƒâ€¢Ãƒâ„¢ÃƒÅ¡Ã„â€šĐÃ„Â¨Ã…Â¨Ã†Â ÃƒÂ áâãèéêìíòóôõùúÃ„Æ’đÃ„Â©Ã…Â©ơÃ†Â¯Ã„â€šÃƒâ€šÃƒÅ Ãƒâ€Ã†Â Ã†Â¯ưÃ„Æ’âêôơư]/g, (c) => {
 const map: Record<string, string> = {
 'Đ': 'D', 'đ': 'd',
 'Ãƒâ‚¬': 'A', 'ÃƒÂ': 'A', 'Ãƒâ€š': 'A', 'ÃƒÆ’': 'A', 'ÃƒË†': 'E', 'Ãƒâ€°': 'E', 'ÃƒÅ ': 'E',
 'ÃƒÅ’': 'I', 'ÃƒÂ': 'I', 'Ãƒâ€™': 'O', 'Ãƒâ€œ': 'O', 'Ãƒâ€': 'O', 'Ãƒâ€¢': 'O', 'Ãƒâ„¢': 'U',
 'ÃƒÅ¡': 'U', 'Ã„â€š': 'A', 'Ã„Â¨': 'I', 'Ã…Â¨': 'U', 'Ã†Â ': 'O',
 'ÃƒÂ ': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'è': 'e', 'é': 'e', 'ê': 'e',
 'ì': 'i', 'í': 'i', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ù': 'u',
 'ú': 'u', 'Ã„Æ’': 'a', 'Ã„Â©': 'i', 'Ã…Â©': 'u', 'ơ': 'o'
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
 const phone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : "";

 const isEmailDuplicate = importedMails.some(im => im.email?.toLowerCase() === email.toLowerCase()) ||
 mails.some(m => m.email?.toLowerCase() === email.toLowerCase());

 const isPhoneDuplicate = phone && (
 importedMails.some(im => im.phone && im.phone.trim() === phone) ||
 mails.some(m => m.phone && m.phone.trim() === phone)
 );

 if (isEmailDuplicate || isPhoneDuplicate) {
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

 const handleExport = () => {
  const data = (filteredMails || []).map((m, i) => ({
    "STT": i + 1,
    "Email": m.email,
    "Mail KP": m.recovery,
    "Pass": m.pass,
    "2FA": m.twoFA,
    "SĐT": m.phone,
    "Link SĐT": m.otpLink
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
 const matchesSearch = (m.email?.toLowerCase() || "").includes(term) ||
 (m.recovery?.toLowerCase() || "").includes(term) ||
 (m.password?.toLowerCase() || m.pass?.toLowerCase() || "").includes(term) ||
 (m.phone?.toLowerCase() || "").includes(term);

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

  const displayedMails = useMemo(() => {
    return (mails || []).map((m: MailData) => {
      const globalSTT = m.type === "ROOT" ? (m.stt || m.id || 0)
        : m.type === "SATELLITE" ? (m.stt || m.id || 1000) - 1000
        : (m.stt || m.id || 2000) - 2000;
      return {
        ...m,
        originalSTT: globalSTT
      };
    });
  }, [mails]);

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

 {isLoading && <LoadingOverlay />}

 <AnimatePresence>
 {showConfirm && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] border border-white/0 rounded-xl p-8 w-full max-w-sm shadow-xl text-center">
 <div className="mx-auto h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
 <AlertTriangle size={32} />
 </div>
 <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">{confirmConfig.title}</h3>
 <p className="text-zinc-400 font-medium mb-6 leading-relaxed text-sm">{confirmConfig.msg}</p>
 <div className="flex gap-3">
 <button onClick={() => setShowConfirm(false)} className="flex-1 h-10 rounded-xl border border-zinc-700 text-zinc-300 font-semibold uppercase text-xs tracking-wider hover:bg-zinc-800 bg-transparent transition-all">Hủy bỏ</button>
 <button onClick={confirmConfig.onConfirm} className="flex-1 h-10 rounded-xl bg-red-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-red-700 transition-all shadow-sm">Xác nhận Xóa</button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <ManualImportModal
 isOpen={showManualImport}
 onClose={() => setShowManualImport(false)}
 onConfirm={(data: string) => {

    // Logic from handleManualImport moved/adapted here
    const lines = data.split("\n");
    let startId = 1;
    const targetType = (type === "ALL" ? "SATELLITE" : type) as "ROOT" | "SATELLITE" | "MONETIZED";
    if (targetType === "ROOT") {
      const rootMails = (mails || []).filter(m => m.type === "ROOT");
      const maxId = rootMails.reduce((max, m) => m.id > max ? m.id : max, 0);
      startId = maxId > 0 ? maxId + 1 : 1;
    } else if (targetType === "SATELLITE") {
      const satMails = (mails || []).filter(m => m.type === "SATELLITE");
      const maxId = satMails.reduce((max, m) => m.id > max ? m.id : max, 1000);
      startId = maxId > 1000 ? maxId + 1 : 1001;
    } else if (targetType === "MONETIZED") {
      const monMails = (mails || []).filter(m => m.type === "MONETIZED");
      const maxId = monMails.reduce((max, m) => m.id > max ? m.id : max, 2000);
      startId = maxId > 2000 ? maxId + 1 : 2001;
    }

    const newItems: MailData[] = [];
    let importedCount = 0;
    let duplicateCount = 0;

    (lines || []).filter(l => l.trim()).forEach((line) => {
      const parts = line.split(/[\t|]|\s{2,}/);
      const email = String(parts[0] || "").trim();
      if (!email) return;
      const phone = String(parts[4] || "").trim();

      const isEmailDuplicate = newItems.some(ni => ni.email?.toLowerCase() === email.toLowerCase()) ||
        mails.some(m => m.email?.toLowerCase() === email.toLowerCase());

      const isPhoneDuplicate = phone && (
        newItems.some(ni => ni.phone && ni.phone.trim() === phone) ||
        mails.some(m => m.phone && m.phone.trim() === phone)
      );

      if (isEmailDuplicate || isPhoneDuplicate) {
        duplicateCount++;
        return;
      }

      newItems.push({
        id: startId + importedCount,
        email,
        pass: String(parts[1] || "").trim(),
        recovery: String(parts[2] || "").trim(),
        twoFA: String(parts[3] || "").trim(),
        phone: String(parts[4] || "").trim(),
        otpLink: String(parts[5] || "").trim(),
        type: targetType,
        status: "LIVE" as const,
        workStatus: (targetType === "MONETIZED" ? "Chưa bán" : "Chưa làm"),
        createdAt: new Date().toISOString().split("T")[0]
      });
      importedCount++;
    });

    if ((newItems || []).length === 0) {
      if (duplicateCount > 0) triggerToast(`Bỏ qua tất cả ${duplicateCount} mail thủ công do trùng lặp!`);
      else triggerToast("Không có dữ liệu hợp lệ!");
      return;
    }

    if (duplicateCount > 0) triggerToast(`Đã bỏ qua ${duplicateCount} mail bị trùng!`);
    setPendingMails(newItems);
    setShowBatchNameModal(true);
 }}
 />

 <ImportHistoryModal
 isOpen={showHistoryModal}
 onClose={() => setShowHistoryModal(false)}
 importHistory={importHistory}
 onDeleteRow={(id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa dòng lịch sử import này?")) return;
    setImportHistory(prev => (prev || []).filter(item => item.id !== id));
 }}
 onClearAll={() => {
    if (!confirm("Xác nhận xóa TOÀN BỘ lịch sử import?")) return;
    setImportHistory([]);
 }}
 />

 {(!isStaff || !selectedBatch) && (
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button onClick={() => router.push("/admin")} className="p-2 rounded-xl bg-zinc-900 border border-white/0 text-zinc-400 hover:text-[#a07800] hover:border-[#a07800] transition-all shadow-sm">
   <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-2xl font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-2">
 <Mail className="text-[#a07800]" size={24} />
 Danh sách {type ==="ALL" ?"Tất cả" : type ==="ROOT" ?"Mail Gốc" : type ==="SATELLITE" ?"Mail Vệ Tinh" :"Mail Bật Kiếm Tiền"}
 </h2>
 <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Quản lý kho dữ liệu email và SĐT của hệ thống</p>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2">

 {isAdminOrManager && (
 <>
 <button onClick={() => setShowHistoryModal(true)} className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/0 rounded-xl text-zinc-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><FileText size={14} className="text-[#a07800]" /> Lịch sử Import</button>
 <button onClick={() => setShowManualImport(true)} className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/0 rounded-xl text-zinc-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><PlusCircle size={14} className="text-[#a07800]" /> Thêm thủ công</button>
 <label className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/0 rounded-xl text-zinc-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"><Upload size={14} className="text-[#a07800]" /> Import Excel <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} /></label>
 <button onClick={handleExport} className="h-9 px-4 bg-[#a07800]/10 border border-[#a07800]/20 hover:bg-[#a07800]/20 rounded-xl text-[#a07800] text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><Download size={14} /> Export</button>
 </>
 )}
 </div>
 </div>
 )}

 {isStaff && !selectedBatch && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="bg-[#18181b] border border-white/0 p-5 rounded-xl flex items-center justify-between shadow-sm">
  <div>
  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Tổng mail được giao</p>
  <h3 className="text-xl font-bold text-zinc-100">{staffStats.totalAssigned}</h3>
  </div>
  <div className="h-10 w-10 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-700/50"><Mail size={20} /></div>
  </div>
  <div className="bg-[#18181b] border border-white/0 p-5 rounded-xl flex items-center justify-between shadow-sm">
  <div>
  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Đã làm</p>
  <h3 className="text-xl font-bold text-green-500">{staffStats.doneChannel}</h3>
  </div>
  <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20"><CheckCircle size={20} /></div>
  </div>
  <div className="bg-[#18181b] border border-white/0 p-5 rounded-xl flex items-center justify-between shadow-sm">
  <div>
  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Lỗi (Die)</p>
  <h3 className="text-xl font-bold text-red-500">{staffStats.failed}</h3>
  </div>
  <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20"><AlertTriangle size={20} /></div>
  </div>
  </div>
  )}

 {isStaff && type ==="SATELLITE" && !selectedBatch ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
 {(staffBatches || []).map(batch => (
 <button
 key={batch.id}
 onClick={() => setSelectedBatch(batch.name)}
 className="group text-left bg-zinc-900 hover:bg-zinc-800/80 border border-white/0 rounded-xl p-6 transition-all hover:border-[#a07800]/30 flex flex-col shadow-sm"
 >
 <div className="flex items-center justify-between mb-4 w-full">
 <span className="text-[10px] font-bold text-[#a07800] bg-[#a07800]/10 px-2.5 py-1 rounded-lg border border-[#a07800]/20 uppercase tracking-wider">{batch.count} Mail</span>
 <ChevronRight size={18} className="text-zinc-500 group-hover:text-[#a07800] group-hover:translate-x-1 transition-all" />
 </div>
 <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-tight group-hover:text-[#a07800] transition-colors">{batch.name}</h3>
 <p className="text-xs text-zinc-400 mt-2 font-medium">Bấm vào để xem và xử lý các mail trong lô này.</p>
 </button>
 ))}
 </div>
 ) : (
 <div className={` bg-sidebar border border-white/0 rounded-[32px] overflow-hidden shadow-2xl flex flex-col ${selectedBatch
 ?"h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] lg:h-[calc(100vh-160px)]"
 :"h-[calc(100vh-220px)] md:h-[calc(100vh-240px)] lg:h-[calc(100vh-260px)]"
 }`}>
 <div className="p-6 border-b border-white/0 bg-white/0 flex flex-col xl:flex-row items-center justify-between gap-4">
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
 <div className="h-8 w-px bg-white/0 hidden md:block" />
 <div className="flex items-center gap-2 bg-black/20 border border-white/0 rounded-xl px-4 h-10 w-full md:w-64 lg:w-80 focus-within:border-gold transition-all">
 <Search size={16} className="text-gray-500 shrink-0" />
 <input type="text" placeholder="Tìm kiếm Email, Pass, Mail KP, SĐT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white w-full" />
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
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
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
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
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
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
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-sidebar text-white">Tất cả thời gian</option>
 <option value="1_WEEK" className="bg-sidebar text-white">1 tuần gần đây</option>
 <option value="1_MONTH" className="bg-sidebar text-white">1 tháng gần đây</option>
 <option value="2_MONTH" className="bg-sidebar text-white">2 tháng gần đây</option>
 </select>
 <div className="hidden xl:flex items-center gap-3 px-5 py-2 bg-gold/10 border-2 border-gold/20 rounded-2xl shadow-lg shadow-gold/5 group">
 <Mail size={18} className="text-gold animate-pulse" />
 <span className="text-base font-black text-white uppercase tracking-widest">
  Tổng cộng: <span className="text-gold text-base ml-1">{totalCount}</span> <span className="text-gold/60 text-[10px] ml-1">Mail</span>
 </span>
 </div>
 </div>
 <button onClick={() => router.push("/admin")} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-all"><X size={20} /></button>
 </div>

 <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
 <div className="min-w-[1200px]">
 <table className="w-full text-left text-sm font-sans whitespace-nowrap">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0">
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
 {(displayedMails || []).length > 0 ? (displayedMails || []).map((mail: MailData & { originalSTT: number }, index: number) => {
 const rowPadding = isStaff ?"py-1.5 px-6" :"py-3.5 px-6";
 const textSize = isStaff ?"text-sm" :"text-base";
 return (
 <tr key={mail._id || mail.id || index} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
  <td className={`${rowPadding} text-[10px] font-black text-gray-500 whitespace-nowrap`}>
    {(currentPage - 1) * itemsPerPage + index + 1}
  </td>
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
 className="px-4 py-1 rounded-xl bg-gold/10 hover:bg-gold hover:text-sidebar text-gold border border-white/0 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold/5 font-black"
 >
 Xem chi tiết
 </button>
 {isAdminOrManager && (
 <button onClick={() => deleteMail(mail._id || mail.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-inner"><Trash2 size={16} /></button>
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

  <div className="p-6 border-t border-white/0 bg-black/20 flex items-center justify-between">
  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Trang <span className="text-white font-black">{currentPage}</span> / {totalPages || 1}</span>
  <div className="flex gap-2">
  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/0 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronLeft size={18} /></button>
  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/0 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronRight size={18} /></button>
  </div>
  </div>
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

 <BatchNameModal
    isOpen={showBatchNameModal}
    onClose={() => {
      setPendingMails(null);
      setShowBatchNameModal(false);
    }}
    onConfirm={async (batchName) => {
      // Direct integration of handleConfirmBatchImport logic
      if (!pendingMails || (pendingMails || []).length === 0) return;
      const baseBatchName = batchName.trim() || `Lô ngày ${new Date().toLocaleDateString("vi-VN")}`;
      
      const isSatellite = pendingMails.some(m => m.type === "SATELLITE");
      const uniquePrefix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const batchId = `batch-${uniquePrefix}`;
      
      const mappedMails = (pendingMails || []).map(m => ({
        ...m,
        batchId,
        batchName: baseBatchName
      }));

      if (isSatellite) {
        try {
          const savedBatches = localStorage.getItem("global_satellite_batches");
          const batchList = savedBatches ? JSON.parse(savedBatches) : [];
          const exists = batchList.some((b: { name: string }) => b.name === baseBatchName);
          
          if (!exists) {
            const newBatch = {
              id: batchId,
              name: baseBatchName,
              type: "SATELLITE",
              importedAt: new Date().toISOString().split("T")[0],
              mailCount: mappedMails.length,
              importedBy: user?.name || "Admin"
            };
            const updatedBatches = [...batchList, newBatch];
            localStorage.setItem("global_satellite_batches", JSON.stringify(updatedBatches));
            }
            } catch (err) {
            console.error("Lỗi tự động đăng ký lô mail vệ tinh:", err);
            }
            }

            try {
            triggerToast(`Đang lưu ${(mappedMails || []).length} mail vào Server...`);
            const res = await fetch("/api/admin/mails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mappedMails)
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Lỗi lưu dữ liệu");
        }
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Lỗi lưu dữ liệu");

        try {
          const savedMails = localStorage.getItem("global_mails_data");
          const currentMails = savedMails ? JSON.parse(savedMails) : [];
          const newMailsFiltered = (mappedMails || []).filter(nm => !currentMails.some((cm: any) => cm.email === nm.email));
          const updatedMails = [...currentMails, ...newMailsFiltered];
          localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
        } catch (err) {
          console.error("Lỗi cập nhật localStorage global_mails_data:", err);
        }

        setPendingMails(null);
        setShowBatchNameModal(false);
        triggerToast(`Đã lưu thành công ${(mappedMails || []).length} mail!`);
        mutate(); // Reload SWR
      } catch (err: unknown) {
        console.error("Lỗi khi gọi API POST mails:", err);
        if (err instanceof Error) triggerToast(`Lỗi kết nối Server: ${err.message}`);
        else triggerToast(`Lỗi kết nối Server: Không thể lưu mail!`);
      }
    }}
  />
 </div>
 );
}


