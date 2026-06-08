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
 type:"ALL" |"MAIL" |"SÄT";
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
 const [historyTab, setHistoryTab] = useState<"ALL" |"MAIL" |"SÄT">("ALL");

 useEffect(() => {
 // History is no longer loaded from localStorage. 
 // Wait for actual API if available, or just empty.
 }, []);

 const filteredHistory = useMemo(() => {
 if (historyTab ==="ALL") return importHistory;
 return (importHistory || []).filter((item) => item.type === historyTab);
 }, [importHistory, historyTab]);

 const handleDeleteHistoryRow = async (id: string) => {
 if (!confirm("Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a dÃ²ng lá»‹ch sá»­ import nÃ y? (KhÃ´ng áº£nh hÆ°á»Ÿng Ä‘áº¿n dá»¯ liá»‡u Ä‘Ã£ import)")) return;
 const updated = (importHistory || []).filter((item) => item.id !== id);
 setImportHistory(updated);
 };

 const handleClearAllHistory = async () => {
 if (!confirm("XÃ¡c nháº­n xÃ³a TOÃ€N Bá»˜ lá»‹ch sá»­ import? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.")) return;
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

 const [manualData, setManualData] = useState("");
 const [pendingMails, setPendingMails] = useState<MailData[] | null>(null);
 const [importBatchName, setImportBatchName] = useState("");
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
 roleUpper ==="NHÃ‚N VIÃŠN" || 
 roleUpper ==="NV THá»¬ VIá»†C" || 
 roleUpper ==="03" || 
 roleUpper ==="QL NHÃ‚N Sá»°" || 
 roleUpper ==="QUáº¢N LÃ NHÃ‚N Sá»°";
 const isAdminOrManager = roleUpper ==="01" || 
 roleUpper ==="ADMIN" || 
 roleUpper ==="02" || 
 roleUpper ==="QL CÃ”NG VIá»†C" || 
 roleUpper ==="QUáº¢N LÃ CÃ”NG VIá»†C";

  const loadData = useCallback(async () => {
    try {
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
      if (data.success) {
        setMails(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.pages || 1);
          setTotalCount(data.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalCount((data.data || []).length);
        }
        if (data.batches) {
          setBatches(data.batches);
        }
      } else {
        setMails([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err) {
      console.error("Error fetching mails:", err);
      setMails([]);
      setTotalPages(1);
      setTotalCount(0);
    }
  }, [type, currentPage, searchTerm, statusFilter, selectedBatchFilter, assignmentFilter, isStaff, user]);

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, [loadData]);

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
 triggerToast(`ÄÃ£ sao chÃ©p ${label}`);
 };

 const handleWorkStatusChange = async (identifier: string | number, newStatus: string) => {
 const now = new Date().toISOString();
 let updatedMail: MailData | null = null;
 
 // Validation: Require 3 links for SATELLITE mails if marking as"ÄÃ£ lÃ m"
 const targetMail = mails.find(m => m._id === identifier || m.id === identifier);
 if (newStatus ==="ÄÃ£ lÃ m" && targetMail?.type ==="SATELLITE") {
 const links = targetMail.links || [];
 const filledCount = [0, 1, 2].filter(i => links[i] && links[i].trim() !=="").length;
 if (filledCount < 3) {
 alert("Vui lÃ²ng Ä‘iá»n Ä‘á»§ 3 link kÃªnh trÆ°á»›c khi chuyá»ƒn tráº¡ng thÃ¡i ÄÃ£ lÃ m");
 return;
 }
 }

 const updated = (mails || []).map(m => {
 if (m._id === identifier || m.id === identifier) {
 let status = m.status;
 if (newStatus ==="ÄÃ£ lÃ m" || newStatus ==="ÄÃ£ bÃ¡n" || newStatus ==="ChÆ°a lÃ m") {
 status ="LIVE";
 } else if (newStatus ==="Lá»—i") {
 status ="DIE";
 }
 updatedMail = {
 ...m,
 workStatus: newStatus,
 status,
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name || user?.username ||"Há»‡ thá»‘ng"
 };
 return updatedMail;
 }
 return m;
 });
 if (!updatedMail || typeof identifier !== 'string' || identifier.length <= 10) {
 setMails(updated);
 triggerToast("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i cÃ´ng viá»‡c! (Chá»‰ trÃªn giao diá»‡n)");
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
 triggerToast("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i cÃ´ng viá»‡c thÃ nh cÃ´ng!");
 } else {
 const errorData = await res.json();
 triggerToast(`Lá»—i: ${errorData.error || 'KhÃ´ng thá»ƒ cáº­p nháº­t'}`);
 }
 } catch (err) {
 console.error("Lá»—i khi update workStatus lÃªn DB:", err);
 triggerToast("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng khi lÆ°u.");
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
 if (vs ==="Mail veri" || vs?.startsWith("QuÃ©t CCCD")) {
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
 updatedBy: user?.name || user?.username ||"Há»‡ thá»‘ng"
 };
 return updatedMail;
 }
 return m;
 });
 if (!updatedMail || typeof identifier !== 'string' || identifier.length <= 10) {
 setMails(updated);
 triggerToast("ÄÃ£ cáº­p nháº­t chi tiáº¿t thÃ nh cÃ´ng! (Chá»‰ trÃªn giao diá»‡n)");
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
 triggerToast("ÄÃ£ cáº­p nháº­t chi tiáº¿t thÃ nh cÃ´ng!");
 } else {
 const errorData = await res.json();
 triggerToast(`Lá»—i: ${errorData.error || 'KhÃ´ng thá»ƒ cáº­p nháº­t'}`);
 }
 } catch (err) {
 console.error("Lá»—i khi update detail lÃªn DB:", err);
 triggerToast("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng khi lÆ°u.");
 }
 };

 const getStatusSelectStyle = (status: string) => {
 const val = (status ||"").toLowerCase().trim();
 if (val.startsWith("Ä‘Ã£") || val.startsWith("hoÃ n thÃ nh")) {
 return"bg-green-500/10 text-green-500 border-green-500/20";
 }
 if (val ==="lá»—i" || val ==="die" || val ==="mail veri" || val.startsWith("quÃ©t cccd")) {
 return"bg-red-500/10 text-red-500 border-red-500/20";
 }
 return"bg-amber-500/10 text-amber-500 border-amber-500/20";
 };

 const deleteMail = (identifier: string | number) => {
 setConfirmConfig({
 title:"XÃ¡c nháº­n xÃ³a",
 msg:"Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a mail nÃ y?",
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
 triggerToast("ÄÃ£ xÃ³a mail thÃ nh cÃ´ng!");
 } else {
 const errorData = await res.json();
 triggerToast(`Lá»—i: ${errorData.error || 'KhÃ´ng thá»ƒ xÃ³a'}`);
 setShowConfirm(false);
 }
 } else {
 // It's a local mock mail, just delete it
 const finalMails = (mails || []).filter(m => String(m._id) !== String(identifier) && String(m.id) !== String(identifier));
 setMails(finalMails);
 setShowConfirm(false);
 triggerToast("ÄÃ£ xÃ³a mail (local) thÃ nh cÃ´ng!");
 }
 } catch (err) {
 console.error("Lá»—i xÃ³a mail:", err);
 triggerToast("Lá»—i khi xÃ³a mail!");
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
 triggerToast("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u mail há»£p lá»‡!");
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
 firstCellStr.includes("tÃ i khoáº£n") || 
 firstCellStr.includes("tai khoan") || 
 firstCellStr ==="tk" ||
 firstCellStr ==="stt" ||
 firstRow.some(cell => {
 const s = String(cell ||"").toLowerCase().trim();
 return s ==="pass" || s ==="recovery" || s ==="2fa" || s ==="sÄ‘t" || s ==="sdt" || s ==="link otp" || s ==="link sÄ‘t" || s ==="stt";
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
 .replace(/[Ã€ÃÃ‚ÃƒÃˆÃ‰ÃŠÃŒÃÃ’Ã“Ã”Ã•Ã™ÃšÄ‚ÄÄ¨Å¨Æ Ã Ã¡Ã¢Ã£Ã¨Ã©ÃªÃ¬Ã­Ã²Ã³Ã´ÃµÃ¹ÃºÄƒÄ‘Ä©Å©Æ¡Æ¯Ä‚Ã‚ÃŠÃ”Æ Æ¯Æ°ÄƒÃ¢ÃªÃ´Æ¡Æ°]/g, (c) => {
 const map: Record<string, string> = {
 'Ä': 'D', 'Ä‘': 'd',
 'Ã€': 'A', 'Ã': 'A', 'Ã‚': 'A', 'Ãƒ': 'A', 'Ãˆ': 'E', 'Ã‰': 'E', 'ÃŠ': 'E',
 'ÃŒ': 'I', 'Ã': 'I', 'Ã’': 'O', 'Ã“': 'O', 'Ã”': 'O', 'Ã•': 'O', 'Ã™': 'U',
 'Ãš': 'U', 'Ä‚': 'A', 'Ä¨': 'I', 'Å¨': 'U', 'Æ ': 'O',
 'Ã ': 'a', 'Ã¡': 'a', 'Ã¢': 'a', 'Ã£': 'a', 'Ã¨': 'e', 'Ã©': 'e', 'Ãª': 'e',
 'Ã¬': 'i', 'Ã­': 'i', 'Ã²': 'o', 'Ã³': 'o', 'Ã´': 'o', 'Ãµ': 'o', 'Ã¹': 'u',
 'Ãº': 'u', 'Äƒ': 'a', 'Ä©': 'i', 'Å©': 'u', 'Æ¡': 'o'
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
 workStatus: targetType ==="ROOT" ? undefined : (targetType ==="MONETIZED" ?"ChÆ°a bÃ¡n" :"ChÆ°a lÃ m"),
 verificationStatus: targetType ==="ROOT" ?"ChÆ°a xanh" : undefined,
 cccdDate: targetType ==="ROOT" ?"" : undefined,
 createdAt: new Date().toISOString().split("T")[0]
 });
 importedCount++;
 }

 if ((importedMails || []).length === 0) {
 if (duplicateCount > 0) {
 triggerToast(`Bá» qua táº¥t cáº£ ${duplicateCount} mail do bá»‹ trÃ¹ng láº·p!`);
 } else {
 triggerToast("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u mail há»£p lá»‡!");
 }
 return;
 }

 if (duplicateCount > 0) {
 triggerToast(`ÄÃ£ bá» qua ${duplicateCount} mail bá»‹ trÃ¹ng!`);
 }
 setPendingMails(importedMails);
 setImportBatchName("");
 setShowBatchNameModal(true);
 } catch (err) {
 console.error("Import Error:", err);
 triggerToast("Lá»—i xá»­ lÃ½ dá»¯ liá»‡u file Excel!");
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
 const phone = String(parts[4] ||"").trim();

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
 pass: String(parts[1] ||"").trim(),
 recovery: String(parts[2] ||"").trim(),
 twoFA: String(parts[3] ||"").trim(),
 phone: String(parts[4] ||"").trim(),
 otpLink: String(parts[5] ||"").trim(),
 type: targetType,
 status:"LIVE" as const,
 workStatus: (targetType ==="MONETIZED" ?"ChÆ°a bÃ¡n" :"ChÆ°a lÃ m"),
 createdAt: new Date().toISOString().split("T")[0]
 });
 importedCount++;
 });

 if ((newItems || []).length === 0) {
 if (duplicateCount > 0) {
 triggerToast(`Bá» qua táº¥t cáº£ ${duplicateCount} mail thá»§ cÃ´ng do trÃ¹ng láº·p!`);
 } else {
 triggerToast("KhÃ´ng cÃ³ dá»¯ liá»‡u há»£p lá»‡!");
 }
 return;
 }

 if (duplicateCount > 0) {
 triggerToast(`ÄÃ£ bá» qua ${duplicateCount} mail bá»‹ trÃ¹ng!`);
 }
 setPendingMails(newItems);
 setImportBatchName("");
 setShowBatchNameModal(true);
 setManualData("");
 setShowManualImport(false);
 };

 const handleConfirmBatchImport = async () => {
     if (!pendingMails || (pendingMails || []).length === 0) return;
     const baseBatchName = importBatchName.trim() || `LÃ´ ngÃ y ${new Date().toLocaleDateString("vi-VN")}`;
     
     // Check if we are importing SATELLITE mails
     const isSatellite = pendingMails.some(m => m.type === "SATELLITE");
     
     const uniquePrefix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
     const batchId = `batch-${uniquePrefix}`;
     
     const mappedMails = (pendingMails || []).map(m => ({
       ...m,
       batchId,
       batchName: baseBatchName
     }));

     if (isSatellite) {
       // Tá»± Ä‘á»™ng thÃªm LÃ´ má»›i vÃ o danh sÃ¡ch LÃ´ mail vá»‡ tinh Ä‘á»ƒ Frontend render Ä‘áº§y Ä‘á»§
       try {
         const savedBatches = localStorage.getItem("global_satellite_batches");
         const batchList = savedBatches ? JSON.parse(savedBatches) : [];
         const exists = batchList.some((b: any) => b.name === baseBatchName);
         
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
           
           fetch("/api/sync", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               global_satellite_batches: JSON.stringify(updatedBatches)
             })
           }).catch(err => console.error("Lá»—i Ä‘á»“ng bá»™ lÃ´ mail vá»‡ tinh:", err));
         }
       } catch (err) {
         console.error("Lá»—i tá»± Ä‘á»™ng Ä‘Äƒng kÃ½ lÃ´ mail vá»‡ tinh:", err);
       }
     }

    try {
      triggerToast(`Äang lÆ°u ${(mappedMails || []).length} mail vÃ o Server...`);
      // 1. Send all new mails to the database
      const res = await fetch("/api/admin/mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappedMails)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lá»—i lÆ°u dá»¯ liá»‡u");
      }
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Lá»—i lÆ°u dá»¯ liá»‡u");
      }

      // 2. Äá»“ng bá»™ vÃ o localStorage global_mails_data vÃ  API sync store
      try {
        const savedMails = localStorage.getItem("global_mails_data");
        const currentMails = savedMails ? JSON.parse(savedMails) : [];
        const newMailsFiltered = (mappedMails || []).filter(nm => !currentMails.some((cm: any) => cm.email === nm.email));
        const updatedMails = [...currentMails, ...newMailsFiltered];
        localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
        
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            global_mails_data: JSON.stringify(updatedMails)
          })
        }).catch(err => console.error("Lá»—i Ä‘á»“ng bá»™ sync store global_mails_data:", err));
      } catch (err) {
        console.error("Lá»—i Ä‘á»“ng bá»™ global_mails_data:", err);
      }

      setPendingMails(null);
      setImportBatchName("");
      setShowBatchNameModal(false);
      triggerToast(`ÄÃ£ lÆ°u thÃ nh cÃ´ng ${(mappedMails || []).length} mail!`);

      // TRIGGER RELOAD AFTER POST COMPLETE
      window.dispatchEvent(new Event("storage"));
    } catch (err: unknown) {
      console.error("Lá»—i khi gá»i API POST mails:", err);
      // Giá»¯ nguyÃªn modal (khÃ´ng gá»i setShowBatchNameModal(false))
      if (err instanceof Error) {
        triggerToast(`Lá»—i káº¿t ná»‘i Server: ${err.message}`);
      } else {
        triggerToast(`Lá»—i káº¿t ná»‘i Server: KhÃ´ng thá»ƒ lÆ°u mail!`);
      }
    }
  };

 const handleExport = () => {
  const data = (filteredMails || []).map((m, i) => ({
    "STT": i + 1,
    "Email": m.email,
    "Mail KP": m.recovery,
    "Pass": m.pass,
    "2FA": m.twoFA,
    "SÄT": m.phone,
    "Link SÄT": m.otpLink
  }));
  const ws = XLSX.utils.json_to_sheet(data);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws,"Danh_Sach");
 XLSX.writeFile(wb, `AQ_MEDIA_${type}.xlsx`);
 triggerToast("ÄÃ£ xuáº¥t Excel thÃ nh cÃ´ng!");
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

 // Lá»c theo LÃ´
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
 const val = m.verificationStatus ||"ChÆ°a xanh";
 matchesStatus = String(val).toLowerCase() === statusFilter.toLowerCase();
 } else if (type ==="MONETIZED") {
 const val = m.workStatus ||"ChÆ°a bÃ¡n";
 matchesStatus = String(val).toLowerCase() === statusFilter.toLowerCase();
 } else {
 const val = m.workStatus ||"ChÆ°a lÃ m";
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

 const dateToFilter = (type ==="ROOT" && m.verificationStatus ==="QuÃ©t CCCD")
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
 doneChannel: (myMails || []).filter(m => (m.workStatus as string) ==="ÄÃ£ lÃ m").length,
 failed: (myMails || []).filter(m => (m.workStatus as string) ==="Lá»—i").length,
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
 const key = m.batchId || m.batchName ||"LÃ´ chÆ°a phÃ¢n loáº¡i";
 if (!counts[key]) {
 counts[key] = { id: key, name: m.batchName ||"LÃ´ chÆ°a phÃ¢n loáº¡i", count: 0 };
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
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] border border-white/0 rounded-xl p-8 w-full max-w-sm shadow-xl text-center">
 <div className="mx-auto h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
 <AlertTriangle size={32} />
 </div>
 <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">{confirmConfig.title}</h3>
 <p className="text-zinc-400 font-medium mb-6 leading-relaxed text-sm">{confirmConfig.msg}</p>
 <div className="flex gap-3">
 <button onClick={() => setShowConfirm(false)} className="flex-1 h-10 rounded-xl border border-zinc-700 text-zinc-300 font-semibold uppercase text-xs tracking-wider hover:bg-zinc-800 bg-transparent transition-all">Há»§y bá»</button>
 <button onClick={confirmConfig.onConfirm} className="flex-1 h-10 rounded-xl bg-red-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-red-700 transition-all shadow-sm">XÃ¡c nháº­n XÃ³a</button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showManualImport && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] border border-white/0 rounded-xl p-6 w-full max-w-2xl shadow-xl">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-zinc-50 uppercase tracking-tight flex items-center gap-3"><PlusCircle className="text-[#a07800]" size={24} /> Import Thá»§ CÃ´ng</h3>
 <button onClick={() => setShowManualImport(false)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-700/50"><X size={16} /></button>
 </div>
 <p className="text-[10px] text-zinc-500 mb-4 font-semibold uppercase tracking-wider leading-relaxed">
 Äá»‹nh dáº¡ng: Email [Tab/CÃ¡ch] Pass [Tab/CÃ¡ch] Mail KP [Tab/CÃ¡ch] 2FA [Tab/CÃ¡ch] SÄT [Tab/CÃ¡ch] Link OTP
 </p>
 <textarea
 value={manualData} onChange={(e) => setManualData(e.target.value)}
 className="w-full h-64 bg-zinc-950/60 border border-white/0 rounded-xl p-4 text-sm text-zinc-100 focus:border-[#a07800] outline-none transition-all resize-none font-mono"
 placeholder="DÃ¡n dá»¯ liá»‡u cá»§a báº¡n vÃ o Ä‘Ã¢y..."
 />
 <div className="flex gap-3 mt-6">
 <button onClick={() => setShowManualImport(false)} className="flex-1 h-10 rounded-xl border border-zinc-700 text-zinc-300 font-semibold uppercase text-xs tracking-wider hover:bg-zinc-800 bg-transparent transition-all">Há»§y bá»</button>
 <button onClick={handleManualImport} className="flex-1 h-10 rounded-xl bg-[#a07800] text-white font-bold uppercase text-xs tracking-wider hover:bg-[#b88c00] transition-all shadow-sm">XÃ¡c nháº­n ThÃªm</button>
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
 className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="bg-[#18181b] border border-white/0 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl overflow-hidden relative p-6"
 >
 {/* Header */}
 <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/0">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
 <FileText className="text-[#a07800]" size={20} />
 </div>
 <div>
 <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-tight">Lá»ŠCH Sá»¬ IMPORT Há»† THá»NG</h3>
 <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Nháº­t kÃ½ danh sÃ¡ch nháº­p dá»¯ liá»‡u</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {(importHistory || []).length > 0 && (
 <button
 onClick={handleClearAllHistory}
 className="h-9 px-3.5 bg-red-950/20 border border-red-900/30 hover:bg-red-600 hover:text-white rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
 >
 <Trash2 size={13} /> XÃ³a táº¥t cáº£
 </button>
 )}
 <button
 onClick={() => setShowHistoryModal(false)}
 className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/50 transition-colors"
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="flex items-center gap-2 mb-6 bg-zinc-950/40 border border-white/0 p-1 rounded-xl w-fit">
 {(["ALL","MAIL","SÄT"] as Array<"ALL" |"MAIL" |"SÄT">).map((tab) => (
 <button
 key={tab}
 onClick={() => setHistoryTab(tab)}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
 historyTab === tab
 ?"bg-[#a07800] text-white shadow-sm"
 :" text-zinc-400 hover:text-zinc-200"
 }`}
 >
 {tab ==="ALL" ?"Táº¥t cáº£" : tab}
 </button>
 ))}
 </div>

 {/* List Content */}
 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
 {(filteredHistory || []).length === 0 ? (
 <div className="py-12 text-center border border-dashed border-white/0 rounded-xl bg-zinc-950/20">
 <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 border border-zinc-700/50">
 <FileText className="text-zinc-500" size={24} />
 </div>
 <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">KhÃ´ng cÃ³ lá»‹ch sá»­ nháº­p dá»¯ liá»‡u</p>
 <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest font-semibold">CÃ¡c lÆ°á»£t import má»›i sáº½ tá»± Ä‘á»™ng Ä‘Æ°á»£c ghi nháº­n táº¡i Ä‘Ã¢y.</p>
 </div>
 ) : (
 (filteredHistory || []).map((item: ImportHistoryItem) => (
 <div
 key={item.id}
 className="bg-zinc-950/35 border border-white/0 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-all group"
 >
 <div className="flex items-center gap-4">
 {/* Icon / Badge */}
 <div
 className={`h-9 w-9 rounded-lg flex items-center justify-center border font-mono text-[9px] font-bold tracking-widest ${
 item.type ==="MAIL"
 ?"bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
 :"bg-[#a07800]/10 text-[#a07800] border-[#a07800]/20"
 }`}
 >
 {item.type}
 </div>
 
 {/* Details */}
 <div className="space-y-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-sm font-bold text-zinc-200 font-mono break-all">{item.fileName}</span>
 <span className="text-[9px] bg-green-950/30 text-green-400 border border-green-900/30 px-2 py-0.5 rounded-lg font-bold">
 +{item.quantity} {item.type ==="MAIL" ?"mail" :"sá»‘"}
 </span>
 </div>
 
 <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
 <span className="flex items-center gap-1">
 <Calendar size={12} className="" />
 {item.importedAt}
 </span>
 <span className="flex items-center gap-1">
 <UserIcon size={12} className="" />
 NgÆ°á»i nháº­p: <strong className="text-zinc-400">{item.importedBy}</strong>
 </span>
 </div>
 </div>
 </div>

 {/* Delete Individual Row */}
 <button
 onClick={() => handleDeleteHistoryRow(item.id)}
 className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-zinc-700/50"
 title="XÃ³a dÃ²ng lá»‹ch sá»­ nÃ y"
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
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button onClick={() => router.push("/admin")} className="p-2 rounded-xl bg-zinc-900 border border-white/0 text-zinc-400 hover:text-[#a07800] hover:border-[#a07800] transition-all shadow-sm">
   <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-2xl font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-2">
 <Mail className="text-[#a07800]" size={24} />
 Danh sÃ¡ch {type ==="ALL" ?"Táº¥t cáº£" : type ==="ROOT" ?"Mail Gá»‘c" : type ==="SATELLITE" ?"Mail Vá»‡ Tinh" :"Mail Báº­t Kiáº¿m Tiá»n"}
 </h2>
 <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Quáº£n lÃ½ kho dá»¯ liá»‡u email vÃ  SÄT cá»§a há»‡ thá»‘ng</p>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2">

 {isAdminOrManager && (
 <>
 <button onClick={() => setShowHistoryModal(true)} className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/0 rounded-xl text-zinc-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><FileText size={14} className="text-[#a07800]" /> Lá»‹ch sá»­ Import</button>
 <button onClick={() => setShowManualImport(true)} className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/0 rounded-xl text-zinc-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><PlusCircle size={14} className="text-[#a07800]" /> ThÃªm thá»§ cÃ´ng</button>
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
  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Tá»•ng mail Ä‘Æ°á»£c giao</p>
  <h3 className="text-xl font-bold text-zinc-100">{staffStats.totalAssigned}</h3>
  </div>
  <div className="h-10 w-10 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-700/50"><Mail size={20} /></div>
  </div>
  <div className="bg-[#18181b] border border-white/0 p-5 rounded-xl flex items-center justify-between shadow-sm">
  <div>
  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">ÄÃ£ lÃ m</p>
  <h3 className="text-xl font-bold text-green-500">{staffStats.doneChannel}</h3>
  </div>
  <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20"><CheckCircle size={20} /></div>
  </div>
  <div className="bg-[#18181b] border border-white/0 p-5 rounded-xl flex items-center justify-between shadow-sm">
  <div>
  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Lá»—i (Die)</p>
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
 <p className="text-xs text-zinc-400 mt-2 font-medium">Báº¥m vÃ o Ä‘á»ƒ xem vÃ  xá»­ lÃ½ cÃ¡c mail trong lÃ´ nÃ y.</p>
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
 <ArrowLeft size={16} /> Quay láº¡i
 </button>
 )}
 <h3 className="text-xl font-black text-white uppercase tracking-tighter shrink-0">Dá»¯ liá»‡u chi tiáº¿t {selectedBatch ? `- LÃ´ mail` :""}</h3>
 <div className="h-8 w-px bg-white/0 hidden md:block" />
 <div className="flex items-center gap-2 bg-black/20 border border-white/0 rounded-xl px-4 h-10 w-full md:w-64 lg:w-80 focus-within:border-gold transition-all">
 <Search size={16} className="text-gray-500 shrink-0" />
 <input type="text" placeholder="TÃ¬m kiáº¿m Email, Pass, Mail KP, SÄT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white w-full" />
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="ALL" className="bg-sidebar text-white">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
 {type ==="ROOT" ? (
 <>
 <option value="Mail veri" className="bg-sidebar text-white">Mail veri</option>
 <option value="ÄÃ£ xanh" className="bg-sidebar text-white">ÄÃ£ xanh</option>
 <option value="ChÆ°a xanh" className="bg-sidebar text-white">ChÆ°a xanh</option>
 <option value="QuÃ©t CCCD" className="bg-sidebar text-white">QuÃ©t CCCD</option>
 </>
 ) : type ==="MONETIZED" ? (
 <>
 <option value="ÄÃ£ bÃ¡n" className="bg-sidebar text-white">ÄÃ£ bÃ¡n</option>
 <option value="ChÆ°a bÃ¡n" className="bg-sidebar text-white">ChÆ°a bÃ¡n</option>
 </>
 ) : (
 <>
 <option value="Äang xá»­ lÃ­" className="bg-sidebar text-white">Äang xá»­ lÃ­</option>
 <option value="ÄÃ£ lÃ m" className="bg-sidebar text-white">ÄÃ£ lÃ m</option>
 <option value="ChÆ°a lÃ m" className="bg-sidebar text-white">ChÆ°a lÃ m</option>
 <option value="Lá»—i" className="bg-sidebar text-white">Lá»—i</option>
 </>
 )}
 </select>
 {isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <select
 value={assignmentFilter}
 onChange={(e) => setAssignmentFilter(e.target.value as"ALL" |"ASSIGNED" |"UNASSIGNED")}
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
 >
 <option value="ALL" className="bg-sidebar text-white">Tráº¡ng thÃ¡i gÃ¡n</option>
 <option value="ASSIGNED" className="bg-sidebar text-white">ÄÃ£ gÃ¡n</option>
 <option value="UNASSIGNED" className="bg-sidebar text-white">ChÆ°a gÃ¡n</option>
 </select>
 )}
 {(type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <select
 value={selectedBatchFilter}
 onChange={(e) => setSelectedBatchFilter(e.target.value)}
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all animate-fade-in"
 >
 <option value="ALL" className="bg-sidebar text-white">Lá»c theo LÃ´</option>
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
 <option value="ALL" className="bg-sidebar text-white">Táº¥t cáº£ thá»i gian</option>
 <option value="1_WEEK" className="bg-sidebar text-white">1 tuáº§n gáº§n Ä‘Ã¢y</option>
 <option value="1_MONTH" className="bg-sidebar text-white">1 thÃ¡ng gáº§n Ä‘Ã¢y</option>
 <option value="2_MONTH" className="bg-sidebar text-white">2 thÃ¡ng gáº§n Ä‘Ã¢y</option>
 </select>
 <div className="hidden xl:flex items-center gap-3 px-5 py-2 bg-gold/10 border-2 border-gold/20 rounded-2xl shadow-lg shadow-gold/5 group">
 <Mail size={18} className="text-gold animate-pulse" />
 <span className="text-base font-black text-white uppercase tracking-widest">
  Tá»•ng cá»™ng: <span className="text-gold text-base ml-1">{totalCount}</span> <span className="text-gold/60 text-[10px] ml-1">Mail</span>
 </span>
 </div>
 </div>
 <button onClick={() => router.push("/admin")} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-all"><X size={20} /></button>
 </div>

 <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
 <div className="min-w-[1200px]">
 <table className="w-full text-left text-base whitespace-nowrap">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0">
 <tr>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">STT</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Email</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Mail KP</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Pass</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">2FA</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">SÄT</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Link SÄT</th>
 {isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Quáº£n lÃ½</th>
 )}
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Tráº¡ng thÃ¡i</th>
 <th className="py-3 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Thao tÃ¡c</th>
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
 âš ï¸ Thiáº¿u {missingCount} kÃªnh
 </span>
 </div>
 );
 }
 return null;
 })()}
 {mail.email}
 </td>
 <td className={`${rowPadding} cursor-pointer text-sm text-gray-400 hover:text-gold transition-colors whitespace-nowrap`} onClick={() => copyToClipboard(mail.recoveryMail || mail.recovery,"Mail KP")}>{mail.recoveryMail || mail.recovery}</td>
 <td className={`${rowPadding} cursor-pointer text-sm text-gray-500 hover:text-gold transition-colors font-mono whitespace-nowrap`} onClick={() => copyToClipboard(mail.password || mail.pass,"Máº­t kháº©u")}>{mail.password || mail.pass}</td>
 {/* 2FA - TOTP real-time */}
 <td className={`${rowPadding} whitespace-nowrap`}>
 {mail.twoFA ? (
 <TOTPDisplay secret={mail.twoFA} compact onCopy={copyToClipboard} />
 ) : (
 <span className="">---</span>
 )}
 </td>
 {/* SÄT - click to copy */}
 <td className={`${rowPadding} whitespace-nowrap`}>
 {mail.phone ? (
 <button
 onClick={() => copyToClipboard(mail.phone ||"","SÄT")}
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
 Má»Ÿ OTP <ExternalLink size={12} />
 </a>
 ) : (
 <span className="">---</span>
 )}
 </td>
 {isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") && (
 <td className={`${rowPadding} text-sm font-bold whitespace-nowrap`}>
 {mail.assigneeId ? (
 <span className="text-gold">
 {mail.assignedTo ||"ÄÃ£ gÃ¡n"}{mail.batchName ? ` - ${mail.batchName}` :""}
 </span>
 ) : (
 <span className="text-gray-500">ChÆ°a gÃ¡n</span>
 )}
 </td>
 )}
 <td className={`${rowPadding} text-center whitespace-nowrap`}>
 {type ==="ROOT" ? (
 <select
 value={mail.verificationStatus ||"ChÆ°a xanh"}
 onChange={(e) => handleSaveUnifiedDetails(mail._id || mail.id, { verificationStatus: e.target.value })}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.verificationStatus ||"ChÆ°a xanh")}`}
 >
 <option value="Mail veri" className="bg-sidebar text-white">Mail veri</option>
 <option value="ÄÃ£ xanh" className="bg-sidebar text-white">ÄÃ£ xanh</option>
 <option value="ChÆ°a xanh" className="bg-sidebar text-white">ChÆ°a xanh</option>
 <option value="QuÃ©t CCCD" className="bg-sidebar text-white">
 QuÃ©t CCCD {mail.cccdDate ? `(${mail.cccdDate})` :""}
 </option>
 </select>
 ) : type ==="MONETIZED" ? (
 <select
 value={mail.workStatus ||"ChÆ°a bÃ¡n"}
 onChange={(e) => handleWorkStatusChange(mail._id || mail.id, e.target.value)}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus ||"ChÆ°a bÃ¡n")}`}
 >
 <option value="ChÆ°a bÃ¡n" className="bg-sidebar text-white">ChÆ°a bÃ¡n</option>
 <option value="ÄÃ£ bÃ¡n" className="bg-sidebar text-white">ÄÃ£ bÃ¡n</option>
 </select>
 ) : (
 <select
 value={mail.workStatus ||"ChÆ°a lÃ m"}
 onChange={(e) => handleWorkStatusChange(mail._id || mail.id, e.target.value)}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusSelectStyle(mail.workStatus ||"ChÆ°a lÃ m")}`}
 >
 {isStaff && type ==="SATELLITE" ? (
 <>
 <option value="ChÆ°a lÃ m" className="bg-sidebar text-white">ChÆ°a lÃ m</option>
 <option value="ÄÃ£ lÃ m" className="bg-sidebar text-white">ÄÃ£ lÃ m</option>
 <option value="Lá»—i" className="bg-sidebar text-white">Lá»—i</option>
 </>
 ) : (
 <>
 <option value="ChÆ°a lÃ m" className="bg-sidebar text-white">ChÆ°a lÃ m</option>
 <option value="Äang xá»­ lÃ­" className="bg-sidebar text-white">Äang xá»­ lÃ­</option>
 <option value="ÄÃ£ lÃ m" className="bg-sidebar text-white">ÄÃ£ lÃ m</option>
 <option value="Lá»—i" className="bg-sidebar text-white">Lá»—i</option>
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
 Xem chi tiáº¿t
 </button>
 {isAdminOrManager && (
 <button onClick={() => deleteMail(mail._id || mail.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-inner"><Trash2 size={16} /></button>
 )}
 </div>
 </td>
 </tr>
 );
 }) : (
 <tr><td colSpan={isAdminOrManager && (type ==="SATELLITE" || type ==="ROOT" || type ==="MONETIZED") ? 10 : 9} className="py-20 text-center font-bold uppercase tracking-widest">ChÆ°a cÃ³ dá»¯ liá»‡u</td></tr>
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

 {/* Modal Nháº­p TÃªn LÃ´ Import */}
 <AnimatePresence>
 {showBatchNameModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="bg-gray-900 border border-white/0 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
 >
 <div className="p-6 border-b border-white/0 bg-white/0 flex items-center justify-between">
 <h3 className="text-lg font-black text-white uppercase tracking-tighter">Äáº·t TÃªn LÃ´ Cho Dá»¯ Liá»‡u Import</h3>
 <button
 onClick={() => {
 setPendingMails(null);
 setShowBatchNameModal(false);
 }}
 className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors"
 >
 <X size={16} />
 </button>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-sm text-gray-400 font-medium leading-relaxed">
 LÃ´ mail má»›i nháº­p sáº½ Ä‘Æ°á»£c nhÃ³m láº¡i Ä‘á»ƒ thuáº­n tiá»‡n quáº£n lÃ½ cÃ´ng viá»‡c, theo dÃµi tiáº¿n Ä‘á»™ vÃ  phÃ¢n bá»• cho nhÃ¢n viÃªn.
 </p>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">TÃªn LÃ´ Import</label>
 <input
 type="text"
 placeholder="VD: LÃ´ 1 ngÃ y 15/10"
 value={importBatchName}
 onChange={(e) => setImportBatchName(e.target.value)}
 className="w-full bg-black/40 border border-white/0 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-gold transition-all"
 />
 </div>
 </div>
 <div className="p-6 border-t border-white/0 bg-white/0 flex items-center justify-end gap-3">
 <button
 onClick={() => {
 setPendingMails(null);
 setShowBatchNameModal(false);
 }}
 className="px-5 py-2.5 rounded-xl border border-white/0 text-sm font-bold text-gray-400 hover:text-white transition-colors"
 >
 Há»§y bá»
 </button>
 <button
 onClick={handleConfirmBatchImport}
 className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-[#0a0a0a] text-sm font-black uppercase tracking-wider transition-all"
 >
 XÃ¡c nháº­n náº¡p
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}

