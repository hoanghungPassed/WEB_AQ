"use client";

import React, { useState, useEffect, useMemo } from"react";
import { 
 Database, 
 Trash2, 
 X, 
 ArrowLeft, 
 Layers, 
 User, 
 Calendar, 
 Mail, 
 PlusCircle, 
 Plus,
 Search,
 CheckCircle2,
 FolderOpen,
 UserCheck,
 RefreshCcw,
 Loader2
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";
import useSWR from "swr";

interface BatchItem {
 _id?: string;
 id: string;
 name: string;
 type:"ROOT" |"SATELLITE" |"MONETIZED";
 importedAt: string;
 mailCount: number;
 importedBy: string;
 assignedTo?: string;
}

export default function SatelliteBatchesPage() {
 const router = useRouter();
 const [user, setUser] = useState<any>(null);
 const [batches, setBatches] = useState<BatchItem[]>([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [toastMsg, setToastMsg] = useState("");
 const [staffList, setStaffList] = useState<any[]>([]);
 const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
 const [assignmentFilter, setAssignmentFilter] = useState<"ALL" |"ASSIGNED" |"UNASSIGNED">("ALL");
 const [staffSearchTerm, setStaffSearchTerm] = useState("");
 const [onlineFilter, setOnlineFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");

 // State for selected batch detail
 const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
 const [batchMails, setBatchMails] = useState<any[]>([]);
 const [unassignedSats, setUnassignedSats] = useState<any[]>([]);
 const [showAddMailModal, setShowAddMailModal] = useState(false);
 const [selectedMailsToAdd, setSelectedMailsToAdd] = useState<number[]>([]);
 const [selectedStaffToAssign, setSelectedStaffToAssign] = useState("");
 const [batchToDelete, setBatchToDelete] = useState<BatchItem | null>(null);
 const [batchToReset, setBatchToReset] = useState<BatchItem | null>(null);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [newBatchName, setNewBatchName] = useState("");
 const [targetStaffId, setTargetStaffId] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [showRangeModal, setShowRangeModal] = useState(false);

 useEffect(() => {
 // Authenticate
 const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (storedUser) {
 const parsed = JSON.parse(storedUser);
 setUser(parsed);
 const role = String(parsed.role ||"").toUpperCase();
 if (role !=="01" && role !=="02" && role !=="ADMIN" && role !=="QUẢN LÝ CÔNG VIỆC" && role !=="QL CÔNG VIỆC") {
 window.location.href ="/admin";
 }
 } else {
 window.location.href ="/login";
 }

 const loadData = async () => {
  try {
    const [batchesRes, staffRes] = await Promise.all([
      fetch("/api/admin/mail/satellite-batches"),
      fetch("/api/admin/users")
    ]);

    let list: BatchItem[] = [];
    if (batchesRes.ok) {
      const data = await batchesRes.json();
      list = data.batches || [];
      localStorage.setItem("global_satellite_batches", JSON.stringify(list));
    }

    if (staffRes.ok) {
      const staffData = await staffRes.json();
      const allUsers = staffData.users || staffData.data || [];
      const staffOnly = (allUsers || []).filter((u: any) => 
        u.role ==="04" || u.role ==="05" || u.role ==="03" || u.role ==="NHÂN VIÊN" || u.role ==="NV THỬ VIỆC" || u.role ==="QUẢN LÝ NHÂN SỰ"
      );
      setStaffList(staffOnly);
    }

    const savedMails = localStorage.getItem("global_mails_data");
    const mails = savedMails ? JSON.parse(savedMails) : [];

    // Sync mail counts dynamically
    const syncedList = (list || []).map(b => {
      const count = (mails || []).filter((m: any) => m.type ==="SATELLITE" && m.batchName === b.name).length;
      return { ...b, mailCount: count };
    });
    setBatches(syncedList);

  } catch (err) {
    console.error("Lỗi loadData satellite-batches:", err);
    
    // Fallback logic
    const savedBatches = localStorage.getItem("global_satellite_batches");
    const savedUsers = localStorage.getItem("global_users");
    const savedMails = localStorage.getItem("global_mails_data");
    const mails = savedMails ? JSON.parse(savedMails) : [];

    const list = savedBatches ? JSON.parse(savedBatches) : [];
    const users = savedUsers ? JSON.parse(savedUsers) : [];

    const staffOnly = (users || []).filter((u: any) => 
      u.role ==="04" || u.role ==="05" || u.role ==="03" || u.role ==="NHÂN VIÊN" || u.role ==="NV THỬ VIỆC" || u.role ==="QUẢN LÝ NHÂN SỰ"
    );
    setStaffList(staffOnly);

    const syncedList = (list || []).map((b: any) => {
      const count = (mails || []).filter((m: any) => m.type ==="SATELLITE" && m.batchName === b.name).length;
      return { ...b, mailCount: count };
    });
    setBatches(syncedList);
  }
 };

 loadData();
 window.addEventListener("storage", loadData);
 return () => window.removeEventListener("storage", loadData);
 }, []);

  useEffect(() => {
    if (!selectedStaff) return;
    const fetchUserBatches = async () => {
      try {
        const res = await fetch(`/api/admin/mail/satellite-batches?assignedTo=${selectedStaff.id || selectedStaff._id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.batches) {
            const savedBatches = localStorage.getItem("global_satellite_batches");
            const localList: BatchItem[] = savedBatches ? JSON.parse(savedBatches) : [];
            const otherBatches = localList.filter(b => String(b.assignedTo) !== String(selectedStaff.id));
            const newList = [...otherBatches, ...data.batches];
            localStorage.setItem("global_satellite_batches", JSON.stringify(newList));
            setBatches(newList);
          }
        }
      } catch (err) {
        console.error("Lỗi fetch user batches:", err);
      }
    };
    fetchUserBatches();
  }, [selectedStaff]);

 const triggerToast = (msg: string) => {
 setToastMsg(msg);
 setTimeout(() => setToastMsg(""), 3000);
 };

  const handleCreateBatch = () => {
    const nextNum = (batches || []).length + 1;
    setNewBatchName(`Lô ${nextNum}`);
    setTargetStaffId(selectedStaff?.id || "");
    setShowCreateModal(true);
  };

  const handleSubmitNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      triggerToast("Vui lòng điền tên lô!");
      return;
    }
    // Ưu tiên selectedStaff đã chọn từ màn hình ngoài, fallback sang dropdown
    const resolvedStaffId = targetStaffId || selectedStaff?.id || "";
    if (!resolvedStaffId) {
      triggerToast("Vui lòng chọn nhân viên nhận gán!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/mail/satellite-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBatchName.trim(),
          assignedTo: resolvedStaffId,
          importedBy: user?.name || "Admin"
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(`Đã tạo thành công ${newBatchName.trim()}!`);
        setShowCreateModal(false);
        setNewBatchName("");

        // Cập nhật lại global_mails_data trong localStorage
        try {
          const mailRes = await fetch("/api/admin/mails?type=SATELLITE&all=true");
          if (mailRes.ok) {
            const mailData = await mailRes.json();
            if (mailData.success && mailData.data) {
              localStorage.setItem("global_mails_data", JSON.stringify(mailData.data));
            }
          }
        } catch (_) {}

        // Re-load to update list
        // Note: loadData is defined inside useEffect, so we'd typically trigger a refresh logic here
        window.dispatchEvent(new Event("storage"));
      } else {
        triggerToast(data.error || "Không thể tạo lô mail!");
      }
    } catch (err) {
      console.error("Lỗi khi tạo lô mail vệ tinh:", err);
      triggerToast("Lỗi kết nối máy chủ!");
    } finally {
      setIsSubmitting(false);
    }
  };

 // When a batch is selected, load its mails and unassigned satellite mails
 useEffect(() => {
 if (!selectedBatch || !selectedStaff) return;
 const loadMailsData = () => {
 const savedMails = localStorage.getItem("global_mails_data");
 const mails = savedMails ? JSON.parse(savedMails) : [];
 
 const inBatch = (mails || []).filter((m: any) => 
 m.type ==="SATELLITE" && 
 m.batchName === selectedBatch.name && 
 String(m.assigneeId) === String(selectedStaff.id)
 );
 setBatchMails(inBatch);

 const unassigned = (mails || []).filter((m: any) => m.type ==="SATELLITE" && (!m.batchName || m.batchName ===""));
 setUnassignedSats(unassigned);

 // Pre-focus the assignee list on the selected staff member
 setSelectedStaffToAssign(selectedStaff.id);
 };
 loadMailsData();
 }, [selectedBatch, selectedStaff]);

 // Assign entire batch to a staff member
 const handleAssignBatchToStaff = () => {
 if (!selectedBatch) return;
 if (!selectedStaffToAssign) {
 triggerToast("Vui lòng chọn một nhân viên để gán!");
 return;
 }

 const staff = staffList.find(s => String(s.id) === String(selectedStaffToAssign) || s.username === selectedStaffToAssign);
 if (!staff) {
 triggerToast("Nhân viên không hợp lệ hoặc offline!");
 return;
 }

 const savedMails = localStorage.getItem("global_mails_data");
 const mails = savedMails ? JSON.parse(savedMails) : [];
 const now = new Date().toISOString();

 const updatedMails = (mails || []).map((m: any) => {
 if (m.type ==="SATELLITE" && m.batchName === selectedBatch.name) {
 return {
 ...m,
 assigneeId: staff.id || staff.username,
 assignedTo: staff.name,
 batchId: selectedBatch.id,
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name ||"Admin"
 };
 }
 return m;
 });

 localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
 window.dispatchEvent(new Event("storage"));
 
 // Log Activity
 const existingLogs = localStorage.getItem("global_system_logs");
 const logsList = existingLogs ? JSON.parse(existingLogs) : [];
 const newLog = {
 id: `log-${Date.now()}`,
 user: user?.name ||"Admin",
 role:"ADMIN",
 action: `Gán Lô Vệ Tinh"${selectedBatch.name}" cho nhân viên ${staff.name}`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 };
 localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

 // Push real-time notification for the target staff member
 const existingNotifs = localStorage.getItem("admin_notifications");
 const notifList = existingNotifs ? JSON.parse(existingNotifs) : [];
 const newNotif = {
 id: `notif-${Date.now()}`,
 title:"Phân công Lô Mail Vệ Tinh",
 message: `Bạn đã được gán Lô Mail Vệ Tinh"${selectedBatch.name}" để xử lý công việc.`,
 time: new Date().toLocaleTimeString("vi-VN") +" -" + new Date().toLocaleDateString("vi-VN"),
 type:"ASSIGNMENT",
 read: false,
 targetUsername: staff.username
 };
 localStorage.setItem("admin_notifications", JSON.stringify([newNotif, ...notifList]));
 window.dispatchEvent(new Event("storage"));

 triggerToast(`Đã gán thành công Lô"${selectedBatch.name}" cho ${staff.name}!`);
 };

 // Unassign/Release all mails inside a batch for the current staff member
 const handleUnassignBatch = () => {
 if (!selectedBatch || !selectedStaff) return;

 const savedMails = localStorage.getItem("global_mails_data");
 const mails = savedMails ? JSON.parse(savedMails) : [];
 const now = new Date().toISOString();

 const updatedMails = (mails || []).map((m: any) => {
 if (
 m.type ==="SATELLITE" && 
 m.batchName === selectedBatch.name && 
 String(m.assigneeId) === String(selectedStaff.id)
 ) {
 return {
 ...m,
 assigneeId:"",
 assignedTo:"",
 batchName:"",
 batchId:"",
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name ||"Admin"
 };
 }
 return m;
 });

 localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
 window.dispatchEvent(new Event("storage"));

 setBatchMails([]);
 setSelectedStaffToAssign("");

 // Sync batches count
 const savedBatches = localStorage.getItem("global_satellite_batches");
 const list = savedBatches ? JSON.parse(savedBatches) : [];
 const syncedList = (list || []).map((b: any) => {
 if (b.name === selectedBatch.name) {
 return { ...b, mailCount: 0 };
 }
 return b;
 });
 setBatches(syncedList);
 localStorage.setItem("global_satellite_batches", JSON.stringify(syncedList));

 // Log Activity
 const existingLogs = localStorage.getItem("global_system_logs");
 const logsList = existingLogs ? JSON.parse(existingLogs) : [];
 const newLog = {
 id: `log-${Date.now()}`,
 user: user?.name ||"Admin",
 role:"ADMIN",
 action: `Hủy gán / Giải phóng toàn bộ mail vệ tinh thuộc"${selectedBatch.name}"`,
 type:"WARNING",
 timestamp: new Date().toLocaleString("vi-VN")
 };
 localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

 triggerToast(`Đã hủy gán & giải phóng toàn bộ mail trong Lô"${selectedBatch.name}"!`);
 };

 // Trigger delete modal
 const handleDeleteBatch = (e: React.MouseEvent, batch: BatchItem) => {
 e.stopPropagation(); // prevent opening the batch modal
 setBatchToDelete(batch);
 };

 // Perform the actual batch deletion after user confirmation
 const confirmDeleteBatch = () => {
 if (!batchToDelete) return;

 // 1. Release mails
 const savedMails = localStorage.getItem("global_mails_data");
 const mails = savedMails ? JSON.parse(savedMails) : [];
 const now = new Date().toISOString();
 const updatedMails = (mails || []).map((m: any) => {
 if (m.type ==="SATELLITE" && m.batchName === batchToDelete.name) {
 return {
 ...m,
 assigneeId:"",
 assignedTo:"",
 batchName:"",
 batchId:"",
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name ||"Admin"
 };
 }
 return m;
 });
 localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));

 // 2. Remove batch from list
 const savedBatches = localStorage.getItem("global_satellite_batches");
 const list = savedBatches ? JSON.parse(savedBatches) : [];
 const updatedBatches = (list || []).filter((b: any) => b.id !== batchToDelete.id);
 localStorage.setItem("global_satellite_batches", JSON.stringify(updatedBatches));
 setBatches(updatedBatches);

 // 3. Log Activity
 const existingLogs = localStorage.getItem("global_system_logs");
 const logsList = existingLogs ? JSON.parse(existingLogs) : [];
 const newLog = {
 id: `log-${Date.now()}`,
 user: user?.name ||"Admin",
 role:"ADMIN",
 action: `Xóa Lô Vệ Tinh"${batchToDelete.name}" và giải phóng toàn bộ mail liên quan`,
 type:"ERROR",
 timestamp: new Date().toLocaleString("vi-VN")
 };
 localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

 window.dispatchEvent(new Event("storage"));
 triggerToast(`Đã xóa thành công ${batchToDelete.name}!`);
 setBatchToDelete(null);
 };

 // Trigger reset modal
 const handleResetBatchLinks = (e: React.MouseEvent, batch: BatchItem) => {
 e.stopPropagation();
 setBatchToReset(batch);
 };

 // Perform actual reset
 const confirmResetBatchLinks = () => {
 if (!batchToReset) return;
 const savedMails = localStorage.getItem("global_mails_data");
 let mails = savedMails ? JSON.parse(savedMails) : [];
 let updated = false;

 mails = (mails || []).map((m: any) => {
 if (m.type ==="SATELLITE" && m.batchName === batchToReset.name) {
 updated = true;
 return {
 ...m,
 links: ["","",""],
 channelNames: ["","",""],
 eligibleChannels: [false, false, false],
 workStatus:"Chưa làm",
 updatedAt: new Date().toISOString(),
 };
 }
 return m;
 });

 if (updated) {
 localStorage.setItem("global_mails_data", JSON.stringify(mails));
 window.dispatchEvent(new Event("storage"));
 triggerToast(`Đã reset toàn bộ link kênh trong lô"${batchToReset.name}"!`);
 }
 setBatchToReset(null);
 };

 // Add selected unassigned mails to this batch
 const handleAddMailsToBatch = () => {
 if ((selectedMailsToAdd || []).length === 0 || !selectedBatch || !selectedStaff) return;

 const savedMails = localStorage.getItem("global_mails_data");
 const mails = savedMails ? JSON.parse(savedMails) : [];
 const now = new Date().toISOString();

 const updatedMails = (mails || []).map((m: any) => {
 if (selectedMailsToAdd.includes(m.id)) {
 return {
 ...m,
 batchName: selectedBatch.name,
 batchId: selectedBatch.id,
 assigneeId: selectedStaff.id || selectedStaff.username,
 assignedTo: selectedStaff.name,
 lastUpdated: now,
 updatedAt: now,
 updatedBy: user?.name ||"Admin"
 };
 }
 return m;
 });

 localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
 window.dispatchEvent(new Event("storage"));

 // Recalculate states for this specific staff member
 const inBatch = (updatedMails || []).filter((m: any) => 
 m.type ==="SATELLITE" && 
 m.batchName === selectedBatch.name && 
 String(m.assigneeId) === String(selectedStaff.id)
 );
 setBatchMails(inBatch);

 const unassigned = (updatedMails || []).filter((m: any) => m.type ==="SATELLITE" && (!m.batchName || m.batchName ===""));
 setUnassignedSats(unassigned);

 // Sync batches
 const savedBatches = localStorage.getItem("global_satellite_batches");
 const list = savedBatches ? JSON.parse(savedBatches) : [];
 const syncedList = (list || []).map((b: any) => {
 if (b.name === selectedBatch.name) {
 return { ...b, mailCount: (inBatch || []).length };
 }
 return b;
 });
 setBatches(syncedList);
 localStorage.setItem("global_satellite_batches", JSON.stringify(syncedList));

 // Push real-time notification for manual additions
 const existingNotifs = localStorage.getItem("admin_notifications");
 const notifList = existingNotifs ? JSON.parse(existingNotifs) : [];
 const newNotif = {
 id: `notif-${Date.now()}`,
 title:"Giao thêm mail vệ tinh lẻ",
 message: `Bạn đã được gán lẻ thêm ${(selectedMailsToAdd || []).length} mail vệ tinh vào Lô"${selectedBatch.name}".`,
 time: new Date().toLocaleTimeString("vi-VN") +" -" + new Date().toLocaleDateString("vi-VN"),
 type:"ASSIGNMENT",
 read: false,
 targetUsername: selectedStaff.username
 };
 localStorage.setItem("admin_notifications", JSON.stringify([newNotif, ...notifList]));
 window.dispatchEvent(new Event("storage"));

 setSelectedMailsToAdd([]);
 setShowAddMailModal(false);
 triggerToast(`Đã thêm thành công ${(selectedMailsToAdd || []).length} mail vào Lô!`);
 };

 // Sync mail counts dynamically for the selected staff
 const syncedBatches = useMemo(() => {
 if (!selectedStaff) return [];
 const savedMails = typeof window !=="undefined" ? localStorage.getItem("global_mails_data") : null;
 const mails = savedMails ? JSON.parse(savedMails) : [];
 
 const staffBatches = (batches || []).filter(b => String(b.assignedTo) === String(selectedStaff.id));
 
 return staffBatches.map(b => {
 const count = (mails || []).filter((m: any) => 
 m.type ==="SATELLITE" && 
 m.batchName === b.name && 
 String(m.assigneeId) === String(selectedStaff.id)
 ).length;
 return { ...b, mailCount: count };
 });
 }, [batches, selectedStaff]);

 // Count how many satellite batches are currently unassigned (i.e. have no assigned mails)
 const unassignedBatchesCount = useMemo(() => {
 const savedMails = typeof window !=="undefined" ? localStorage.getItem("global_mails_data") : null;
 const allMails = savedMails ? JSON.parse(savedMails) : [];
 const satelliteMails = (allMails || []).filter((m: any) => m.type ==="SATELLITE");

 // Filter batches that have no assigned mails or where mails have no assignee
 return (batches || []).filter(b => {
 const bMails = (satelliteMails || []).filter((m: any) => m.batchName === b.name);
 return (bMails || []).length === 0 || bMails.every((m: any) => !m.assigneeId);
 }).length;
 }, [batches]);

 const renderStaffSelectionScreen = () => {
 const savedMails = typeof window !=="undefined" ? localStorage.getItem("global_mails_data") : null;
 const allMails = savedMails ? JSON.parse(savedMails) : [];
 const satelliteMails = (allMails || []).filter((m: any) => m.type ==="SATELLITE");

 // Filter staff members based on search, online status, and assignment status
 const filteredStaffList = (staffList || []).filter(staff => {
 const staffMails = (satelliteMails || []).filter((m: any) => String(m.assigneeId) === String(staff.id));
 const hasAssignment = (staffMails || []).length > 0;
 
 // Check online status
 const isOnline = staff.lastActive ? (Date.now() - new Date(staff.lastActive).getTime() < 15 * 60000) : (staff.isOnline === true);

 // Apply assignment filter
 if (assignmentFilter ==="ASSIGNED" && !hasAssignment) return false;
 if (assignmentFilter ==="UNASSIGNED" && hasAssignment) return false;

 // Apply search filter
 if (staffSearchTerm) {
   const term = staffSearchTerm.toLowerCase();
   if (!staff.name?.toLowerCase().includes(term) && !staff.username?.toLowerCase().includes(term)) {
     return false;
   }
 }

 // Apply online filter
 if (onlineFilter === "ONLINE" && !isOnline) return false;
 if (onlineFilter === "OFFLINE" && isOnline) return false;

 return true;
 });

 return (
 <div className="flex flex-col h-full space-y-6 min-h-0">
 {/* Header */}
 <div className="flex items-center gap-4 flex-shrink-0">
 <button 
 onClick={() => router.push("/admin")}
 className="p-2 rounded-xl bg-sidebar border border-white/0 text-gray-400 hover:text-white transition-all shadow-md"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <Layers className="text-gold" size={28} />
 Lô Mail Vệ Tinh - Chọn Nhân Sự
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Phân phối lô mail và gán cho nhân sự xử lý kênh vệ tinh
 </p>
 </div>
 </div>

 {/* Filter Bar */}
 <div className="flex flex-col lg:flex-row bg-sidebar/50 border border-white/0 p-6 rounded-[20px] flex-shrink-0 gap-6 lg:items-center justify-between">
 {/* Search */}
 <div className="relative group flex-1">
   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
   <input 
     placeholder="Tìm kiếm nhân sự..."
     className="w-full bg-black/40 border border-white/0 rounded-xl pl-12 pr-4 h-12 text-sm text-white outline-none focus:border-white/5 transition-all"
     type="text" 
     value={staffSearchTerm}
     onChange={(e) => setStaffSearchTerm(e.target.value)}
   />
 </div>

 {/* Filters */}
 <div className="flex flex-wrap items-center gap-6">
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Lọc Online:</span>
 <div className="flex bg-black/40 border border-white/0 rounded-xl p-1">
 <button
 onClick={() => setOnlineFilter("ALL")}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 onlineFilter ==="ALL" 
 ?"bg-gold text-sidebar shadow-md" 
 :" text-gray-400 hover:text-white"
 }`}
 >
 Tất cả
 </button>
 <button
 onClick={() => setOnlineFilter("ONLINE")}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 onlineFilter ==="ONLINE" 
 ?"bg-gold text-sidebar shadow-md" 
 :" text-gray-400 hover:text-white"
 }`}
 >
 Online
 </button>
 <button
 onClick={() => setOnlineFilter("OFFLINE")}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 onlineFilter ==="OFFLINE" 
 ?"bg-gold text-sidebar shadow-md" 
 :" text-gray-400 hover:text-white"
 }`}
 >
 Offline
 </button>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Lọc Trạng Thái:</span>
 <div className="flex bg-black/40 border border-white/0 rounded-xl p-1">
 <button
 onClick={() => setAssignmentFilter("ALL")}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 assignmentFilter ==="ALL" 
 ?"bg-gold text-sidebar shadow-md" 
 :" text-gray-400 hover:text-white"
 }`}
 >
 Tất cả
 </button>
 <button
 onClick={() => setAssignmentFilter("ASSIGNED")}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 assignmentFilter ==="ASSIGNED" 
 ?"bg-gold text-sidebar shadow-md" 
 :" text-gray-400 hover:text-white"
 }`}
 >
 Đã gán
 </button>
 <button
 onClick={() => setAssignmentFilter("UNASSIGNED")}
 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
 assignmentFilter ==="UNASSIGNED" 
 ?"bg-gold text-sidebar shadow-md" 
 :" text-gray-400 hover:text-white"
 }`}
 >
 Chưa gán
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Staff List Table-like Structure */}
 <div className="flex-1 min-h-0 bg-sidebar border border-white/0 rounded-[24px] p-6 shadow-xl flex flex-col justify-between">
 <div className="flex items-center justify-between pb-4 border-b border-white/0 text-[10px] font-black text-gray-500 uppercase tracking-wider flex-shrink-0 px-4">
 <div className="w-1/3">Nhân sự</div>
 <div className="w-1/4 text-center">Trạng thái hoạt động</div>
 <div className="w-1/4 text-center">Tình trạng gán lô</div>
 <div className="w-1/6 text-right">Thao tác</div>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 space-y-2 pr-2">
 {(filteredStaffList || []).map((staff) => {
 const staffBatches = (batches || []).filter((b: any) => String(b.assignedTo) === String(staff.id) || String(b.assignedTo) === String(staff.username));
 const staffMails = (satelliteMails || []).filter((m: any) => String(m.assigneeId) === String(staff.id));
 const isOnline = staff.lastActive ? (Date.now() - new Date(staff.lastActive).getTime() < 15 * 60000) : (staff.isOnline === true);
 const hasAssignment = staffBatches.length > 0;
 const unassignedCountForStaff = staffBatches.filter((b: any) => !b.mailCount || b.mailCount === 0).length;

 return (
 <div
 key={staff.id}
 onClick={() => {
 setSelectedStaff(staff);
 setSelectedStaffToAssign(staff.id);
 }}
 className="flex items-center justify-between p-6 rounded-2xl bg-zinc-900/[0.03] hover:bg-zinc-800/50 border border-white/0 hover:border-white/0 transition-all cursor-pointer group px-4"
 >
 {/* Column 1: Info */}
 <div className="w-1/3 flex items-center gap-3">
 <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center font-black text-base uppercase shrink-0">
 {staff.name.charAt(0)}
 </div>
 <div className="truncate">
 <p className="text-base font-black text-white transition-colors truncate uppercase">{staff.name}</p>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
 @{staff.username} {hasAssignment ? `(${staffBatches.length} lô - ${(staffMails || []).length} mail)` :"(Chưa gán)"}
 </p>
 </div>
 </div>

 {/* Column 2: Online Status */}
 <div className="w-1/4 flex justify-center">
 <span className={`px-3 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border ${
 isOnline 
 ?"bg-green-500/10 text-green-500 border-green-500/20" 
 :"bg-gray-500/10 text-gray-400 border-gray-500/20"
 }`}>
 {isOnline ?"🟢 Online" :"🔴 Offline"}
 </span>
 </div>

 {/* Column 3: Assignment Status */}
 <div className="w-1/4 flex justify-center">
 {unassignedCountForStaff > 0 ? (
 <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border bg-red-500/10 text-red-500 border-red-500/20 flex items-center justify-center gap-1.5 w-fit">
 <X size={10} className="stroke-[3]" /> Chưa được gán {unassignedCountForStaff} lô mail
 </span>
 ) : (
 <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border bg-gold/10 text-gold border-gold/25 flex items-center justify-center gap-1.5 w-fit">
 <CheckCircle2 size={10} /> Đã được gán lô mail
 </span>
 )}
 </div>

 {/* Column 4: Action */}
 <div className="w-1/6 flex justify-end">
 <button
 className="px-4 h-9 bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md group-hover:scale-105"
 >
 Giao việc
 </button>
 </div>
 </div>
 );
 })}
 {(filteredStaffList || []).length === 0 && (
 <div className="h-full flex flex-col items-center justify-center text-center py-20">
 <FolderOpen size={48} className="mb-3" />
 <h4 className="text-white font-black uppercase tracking-tight">Không tìm thấy nhân viên nào</h4>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 };

 const renderBatchSelectionScreenForStaff = () => {
 const isOnline = selectedStaff.isOnline === true;
 const filtered = (syncedBatches || []).filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

 return (
 <div className="h-full flex flex-col space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => {
 setSelectedStaff(null);
 setSelectedBatch(null);
 }}
 className="p-2 rounded-xl bg-sidebar border border-white/0 text-gray-400 hover:text-white transition-all shadow-md"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <Layers className="text-gold" size={28} />
 Lô Mail - {selectedStaff.name}
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Nhân sự: <span className="text-white font-black">{selectedStaff.name} ({selectedStaff.username})</span> | Trạng thái: <span className={isOnline ?"text-green-500 font-bold" :"text-gray-500 font-bold"}>{isOnline ?"🟢 Online" :"🔴 Offline"}</span>
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="relative group">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
 <input 
 placeholder="Tìm kiếm Lô..."
 className="bg-black/20 border border-white/0 rounded-xl pl-10 pr-4 h-10 text-sm text-white outline-none focus:border-white/5 transition-all w-48"
 type="text" 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>

 <button
 onClick={handleCreateBatch}
 className="bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-sm tracking-widest px-5 h-10 rounded-xl transition-all shadow-lg shadow-gold/25 flex items-center gap-2 shrink-0"
 >
 <PlusCircle size={16} />
 Tạo Lô Mới Cho Nhân Viên Này
 </button>
 </div>
 </div>

 {/* Grid of Batches */}
 <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
 {(filtered || []).length > 0 ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
 {(filtered || []).map((batch, index) => (
 <div
 key={batch._id || batch.id || index}
 onClick={() => setSelectedBatch(batch)}
 className="bg-sidebar border border-white/0 border-t-4 border-t-gold/80 rounded-[24px] p-6 shadow-xl hover:shadow-2xl flex flex-col justify-between relative group transition-all cursor-pointer hover:bg-white/[0.01] hover:scale-[1.01]"
 >
 <div>
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border bg-gold/10 text-gold border-gold/20">
 SATELLITE
 </span>
 <button
 onClick={(e) => handleResetBatchLinks(e, batch)}
 className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-blue-500/20"
 title="Reset toàn bộ link kênh"
 >
 <RefreshCcw size={12} />
 </button>
 <button
 onClick={(e) => handleDeleteBatch(e, batch)}
 className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-red-500/20"
 title="Xóa lô này"
 >
 <Trash2 size={12} />
 </button>
 </div>
 <span className="text-[10px] text-gray-500 font-mono">
 {formatDate(batch.importedAt)}
 </span>
 </div>

 <h3 className="text-xl font-black text-white mt-4 uppercase tracking-tight transition-colors">
 {(batch.name || "").replace(/\s*\(.*\)$/, "")}
 </h3>

 <div className="flex items-baseline gap-1.5 my-3 bg-black/10 rounded-xl p-3 border border-white/0">
 <span className="text-3xl font-black text-gold tracking-tighter leading-none">{batch.mailCount}</span>
 <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Tài khoản đã gán</span>
 </div>
 </div>

 <div className="mt-4 pt-3 border-t border-white/0 flex items-center justify-between text-[11px] text-gray-400 font-bold">
 <span className="inline-flex items-center gap-1">
 <User size={12} className="text-gray-500" /> Nhân sự gán:
 </span>
 <span className="text-gold font-black uppercase">
 {selectedStaff.name}
 </span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="h-60 rounded-3xl border border-white/0 bg-sidebar/20 flex flex-col items-center justify-center text-center p-6">
 <FolderOpen size={48} className="mb-3" />
 <h4 className="text-white font-black uppercase tracking-tight">Không tìm thấy lô mail vệ tinh nào</h4>
 </div>
 )}
 </div>
 </div>
 );
 };

 return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative">
 {/* Toast */}
 <AnimatePresence>
 {toastMsg && (
 <motion.div 
 initial={{ opacity: 0, y: -20, x:"-50%" }} 
 animate={{ opacity: 1, y: 30, x:"-50%" }} 
 exit={{ opacity: 0, y: -20, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-3 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2"
 >
 <CheckCircle2 size={18} /> {toastMsg}
 </motion.div>
 )}
 </AnimatePresence>

 {!selectedStaff ? renderStaffSelectionScreen() : renderBatchSelectionScreenForStaff()}

 {/* Batch detail popup */}
 <AnimatePresence>
 {selectedBatch && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }} 
 animate={{ scale: 1, opacity: 1 }} 
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-[#121212] border border-white/0 rounded-[36px] p-8 w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col justify-between"
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-white/0 pb-4 mb-6">
 <div className="flex items-center gap-3">
 <div className="h-12 w-12 bg-gold/15 text-gold border border-gold/20 rounded-2xl flex items-center justify-center">
 <Layers size={24} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-white uppercase tracking-tight">Cấu hình {(selectedBatch?.name || "").replace(/\s*\(.*\)$/, "")}</h3>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
 Tổng số: {(batchMails || []).length} Mail vệ tinh trong Lô này
 </p>
 </div>
 </div>
 <button 
 onClick={() => {
 setSelectedBatch(null);
 }}
 className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-zinc-800/50 bg-zinc-900/5 text-gray-500 hover:text-white transition-all border border-white/0"
 >
 <X size={20} />
 </button>
 </div>

 {/* Main Grid split */}
 <div className="flex-1 min-h-0 mb-6">
  {(batchMails || []).length === 0 ? (
    <div className="h-full bg-black/20 border border-white/5 rounded-[36px] flex flex-col items-center justify-center text-center py-20 space-y-8">
      <div className="flex flex-col items-center">
        <div className="h-20 w-20 bg-gold/10 text-gold border border-gold/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Mail size={40} />
        </div>
        <h4 className="text-xl font-black text-white uppercase tracking-tight mb-2">Lô Mail Đang Trống</h4>
        <p className="text-sm text-gray-500 uppercase font-bold tracking-widest max-w-md">
          Hệ thống chưa gán dải mail nào cho lô này. Vui lòng chọn dải mail từ kho unassigned (tối đa 17 mail/dải).
        </p>
      </div>
      
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => setShowRangeModal(true)}
          className="px-10 py-5 bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-sm tracking-widest rounded-[24px] transition-all shadow-2xl shadow-gold/20 flex items-center gap-3 hover:scale-105 active:scale-95"
        >
          <div className="h-6 w-6 bg-sidebar/20 rounded-lg flex items-center justify-center">
            <Plus size={16} />
          </div>
          📥 Chọn Dải Mail Từ Kho
        </button>
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
          Tự động chẻ dữ liệu từ kho mail rảnh
        </p>
      </div>
    </div>
  ) : (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Left Column: Staff info & Actions */}
      <div className="lg:col-span-4 flex flex-col justify-between bg-sidebar/30 border border-white/0 rounded-3xl p-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-base font-black text-gold uppercase tracking-widest mb-1">Thông Tin Giao Việc</h4>
            <p className="text-[10px] text-gray-500 font-medium italic">Lô mail đã được kích hoạt và gán cho nhân sự</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Nhân sự đang xử lý</label>
            <div className="flex items-center gap-3 bg-black/40 border border-white/0 rounded-2xl h-16 px-4 border border-white/5">
              <div className="h-9 w-9 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center font-black text-base uppercase shrink-0">
                {selectedStaff.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-sm font-black text-white uppercase truncate">{selectedStaff.name}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">@{selectedStaff.username}</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gold/5 border border-gold/10 space-y-3">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="text-green-500">Đang hoạt động</span>
             </div>
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="text-gray-500">Số lượng mail:</span>
                <span className="text-white">{(batchMails || []).length} / 17</span>
             </div>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-white/5 space-y-3">
          <button
            onClick={handleUnassignBatch}
            className="w-full h-14 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 font-black uppercase text-xs tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Hủy gán & giải phóng lô
          </button>
        </div>
      </div>

      {/* Right Column: Mail list */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-black/20 border border-white/0 rounded-3xl p-6 min-h-0">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <span className="text-sm font-black text-gray-400 uppercase tracking-widest">
            Danh sách tài khoản ({(batchMails || []).length} mail)
          </span>
          <button
            onClick={() => setShowAddMailModal(true)}
            className="text-xs font-black text-gold hover:underline flex items-center gap-1.5 uppercase tracking-widest"
          >
            + Gán lẻ thủ công
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {(batchMails || []).map((mail, idx) => (
            <div key={mail._id || mail.id || idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/0 border border-white/5 hover:border-white/10 transition-colors bg-zinc-900/20">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold font-mono text-gray-600">#{idx + 1}</span>
                <div>
                  <p className="text-sm font-black text-white">{mail.email}</p>
                  <p className="text-[9px] text-gray-500">Recovery: {mail.recoveryMail || mail.recovery || "---"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                  mail.workStatus === "Đã làm" 
                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                    : mail.workStatus === "Lỗi"
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                }`}>
                  {mail.workStatus || "Chưa làm"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}
 </div>

 {/* Footer */}
 <div className="flex justify-end pt-4 border-t border-white/0 flex-shrink-0">
 <button
 onClick={() => {
 setSelectedBatch(null);
 }}
 className="h-12 px-8 bg-white/5 border border-white/0 hover:border-white/5 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all"
 >
 Đóng cấu hình
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

  {/* Range Selection Modal */}
  <AnimatePresence>
  {showRangeModal && selectedBatch && (
    <RangeSelectionModal
      batchId={selectedBatch._id || selectedBatch.id}
      onClose={() => setShowRangeModal(false)}
      onSelectSuccess={async () => {
        triggerToast("Gán dải mail thành công!");
        try {
          const mailRes = await fetch("/api/admin/mails?type=SATELLITE&all=true");
          if (mailRes.ok) {
            const mailData = await mailRes.json();
            if (mailData.success && mailData.data) {
              localStorage.setItem("global_mails_data", JSON.stringify(mailData.data));
              window.dispatchEvent(new Event("storage"));
              
              const inBatch = mailData.data.filter((m: any) => 
                m.type === "SATELLITE" && 
                m.batchName === selectedBatch.name && 
                String(m.assigneeId) === String(selectedStaff.id)
              );
              setBatchMails(inBatch);
            }
          }
        } catch (_) {}
      }}
    />
  )}
  </AnimatePresence>

 {/* Add Mail Modal */}
 <AnimatePresence>
 {showAddMailModal && selectedBatch && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 z-[200] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
 >
 <motion.div 
 initial={{ scale: 0.95, opacity: 0 }} 
 animate={{ scale: 1, opacity: 1 }} 
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-[#121212] border border-white/0 rounded-[32px] p-8 w-full max-w-lg max-h-[70vh] shadow-2xl flex flex-col justify-between"
 >
 <div>
 <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Thêm Mail Từ Kho Vệ Tinh</h3>
 <p className="text-sm text-gray-500 mb-6">Chọn các mail chưa được gán vào lô nào dưới đây:</p>

 <div className="space-y-2 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
 {(unassignedSats || []).map((m, idx) => {
 const isChecked = selectedMailsToAdd.includes(m.id);
 return (
 <label 
 key={m._id || m.id || idx}
 className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
 isChecked 
 ?"bg-gold/10 border-white/0 text-gold" 
 :" bg-white/0 border-white/0 text-gray-300 hover:bg-white/5"
 }`}
 >
 <div className="flex items-center gap-3">
 <input 
 type="checkbox"
 checked={isChecked}
 onChange={() => {
 if (isChecked) {
 setSelectedMailsToAdd((selectedMailsToAdd || []).filter(id => id !== m.id));
 } else {
 setSelectedMailsToAdd([...selectedMailsToAdd, m.id]);
 }
 }}
 className="accent-gold h-4 w-4"
 />
 <div>
 <p className="text-sm font-black">{m.email}</p>
 <p className="text-[9px] opacity-60">STT: #{m.stt || idx + 1}</p>
 </div>
 </div>
 </label>
 );
 })}
 {(unassignedSats || []).length === 0 && (
 <p className="text-center py-10 text-sm uppercase font-black tracking-widest">Không còn mail trống nào trong kho</p>
 )}
 </div>
 </div>

 <div className="flex gap-4 mt-8 pt-4 border-t border-white/0">
 <button
 onClick={() => {
 setShowAddMailModal(false);
 setSelectedMailsToAdd([]);
 }}
 className="flex-1 h-12 bg-white/5 border border-white/0 text-white font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-white/10 transition-all"
 >
 Hủy
 </button>
 <button
 onClick={handleAddMailsToBatch}
 disabled={(selectedMailsToAdd || []).length === 0}
 className="flex-1 h-12 bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-sm tracking-widest rounded-xl transition-all shadow-xl shadow-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Xác nhận thêm
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Custom Confirm Delete Batch Modal */}
 <AnimatePresence>
 {batchToDelete && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div 
 initial={{ scale: 0.95, y: 20 }} 
 animate={{ scale: 1, y: 0 }} 
 exit={{ scale: 0.95, y: 20 }}
 className="bg-sidebar border border-red-500/30 w-full max-w-md rounded-[32px] p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 h-40 w-40 bg-red-500/5 blur-[50px] -mr-20 -mt-20" />
 
 <div className="flex items-center gap-4 mb-6 relative z-10">
 <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
 <Trash2 size={24} />
 </div>
 <div>
 <h3 className="text-lg font-black text-white uppercase tracking-tight">Xóa Lô Mail Vệ Tinh</h3>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hành động không thể hoàn tác</p>
 </div>
 </div>

 <div className="space-y-4 mb-8 text-base text-gray-300 font-medium relative z-10 leading-relaxed">
 <p>
 Bạn có chắc chắn muốn xóa Lô <span className="text-gold font-black uppercase">"{(batchToDelete?.name || "").replace(/\s*\(.*\)$/, "")}"</span>?
 </p>
 <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
 ⚠️ Tất cả các tài khoản mail trong lô này sẽ ngay lập tức được giải phóng và trả về kho vệ tinh unassigned.
 </p>
 </div>

 <div className="flex gap-4 relative z-10">
 <button
 onClick={() => setBatchToDelete(null)}
 className="flex-1 h-12 bg-white/5 border border-white/0 text-white font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-white/10 transition-all"
 >
 Hủy bỏ
 </button>
 <button
 onClick={confirmDeleteBatch}
 className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-sm tracking-widest rounded-xl transition-all shadow-lg shadow-red-500/25"
 >
 Xác nhận xóa
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Custom Confirm Reset Batch Modal */}
 <AnimatePresence>
 {batchToReset && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div 
 initial={{ scale: 0.95, y: 20 }} 
 animate={{ scale: 1, y: 0 }} 
 exit={{ scale: 0.95, y: 20 }}
 className="bg-sidebar border border-blue-500/30 w-full max-w-md rounded-[32px] p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 h-40 w-40 bg-blue-500/5 blur-[50px] -mr-20 -mt-20" />
 
 <div className="flex items-center gap-4 mb-6 relative z-10">
 <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
 <RefreshCcw size={24} />
 </div>
 <div>
 <h3 className="text-lg font-black text-white uppercase tracking-tight">Làm Mới Link Kênh</h3>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hành động không thể hoàn tác</p>
 </div>
 </div>

 <div className="space-y-4 mb-8 text-base text-gray-300 font-medium relative z-10 leading-relaxed">
 <p>
 Bạn có chắc muốn xóa toàn bộ link kênh của các mail vệ tinh trong Lô <span className="text-gold font-black uppercase">"{(batchToReset?.name || "").replace(/\s*\(.*\)$/, "")}"</span> không?
 </p>
 <p className="text-sm text-blue-400 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
 ℹ️ Tất cả link kênh, tên kênh, trạng thái đủ giờ của mail trong lô này sẽ bị xóa trắng và đưa về trạng thái"Chưa làm".
 </p>
 </div>

 <div className="flex gap-4 relative z-10">
 <button
 onClick={() => setBatchToReset(null)}
 className="flex-1 h-12 bg-white/5 border border-white/0 text-white font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-white/10 transition-all"
 >
 Hủy bỏ
 </button>
 <button
 onClick={confirmResetBatchLinks}
 className="flex-1 h-12 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase text-sm tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/25"
 >
 Xác nhận Reset
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Custom Create Batch Modal with double click prevention */}
 <AnimatePresence>
 {showCreateModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.95, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.95, y: 20 }}
 transition={{ type: "spring", duration: 0.5 }}
 className="bg-sidebar border border-white/10 w-full max-w-md rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 h-40 w-40 bg-gold/5 blur-[50px] -mr-20 -mt-20" />
 
 <div className="flex items-center gap-4 mb-6 relative z-10">
 <div className="h-12 w-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20">
 <PlusCircle size={24} />
 </div>
 <div>
 <h3 className="text-xl font-black text-white uppercase tracking-tight">Tạo Lô Mail Mới</h3>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tự động phát 17 mail rảnh</p>
 </div>
 </div>

 <form onSubmit={handleSubmitNewBatch} className="space-y-6 relative z-10">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">
 Tên Lô Mail
 </label>
 <input
 type="text"
 required
 disabled={isSubmitting}
 value={newBatchName}
 onChange={(e) => setNewBatchName(e.target.value)}
 placeholder="Ví dụ: Lô 7"
 className="w-full bg-black/40 border border-white/10 rounded-2xl h-14 px-5 text-sm font-black text-white outline-none focus:border-gold disabled:opacity-50 transition-all"
 />
 </div>

 {/* Chỉ hiển thị dropdown chọn nhân viên nếu chưa có selectedStaff từ màn hình ngoài */}
 {!selectedStaff ? (
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">
 Nhân viên nhận gán
 </label>
 <select
 required
 disabled={isSubmitting}
 value={targetStaffId}
 onChange={(e) => setTargetStaffId(e.target.value)}
 className="w-full bg-black/40 border border-white/10 rounded-2xl h-14 px-5 text-sm font-black text-white outline-none focus:border-gold disabled:opacity-50 cursor-pointer transition-all"
 >
 <option value="" className="bg-zinc-900 text-white">--- Chọn nhân viên ---</option>
 {(staffList || []).map((staff) => (
 <option key={staff.id} value={staff.id} className="bg-zinc-900 text-white">
 {staff.name} (@{staff.username}) {staff.isOnline ? "🟢" : "🔴"}
 </option>
 ))}
 </select>
 </div>
 ) : (
 <div className="bg-gold/5 border border-gold/15 rounded-2xl px-5 py-4 flex items-center gap-3">
 <div className="h-9 w-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center font-black text-sm border border-gold/20">
 {selectedStaff.name?.charAt(0)}
 </div>
 <div>
 <p className="text-sm font-black text-white uppercase">{selectedStaff.name}</p>
 <p className="text-[10px] text-gray-500 font-bold">@{selectedStaff.username}</p>
 </div>
 </div>
 )}

 <div className="flex gap-4 pt-4 border-t border-white/5">
 <button
 type="button"
 disabled={isSubmitting}
 onClick={() => {
 setShowCreateModal(false);
 setNewBatchName("");
 }}
 className="flex-1 h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50"
 >
 Hủy bỏ
 </button>
 <button
 type="submit"
 disabled={isSubmitting || !newBatchName.trim() || (!targetStaffId && !selectedStaff?.id)}
 className="flex-1 h-14 bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-xl shadow-gold/20 disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="animate-spin" size={16} />
 <span>Đang lưu...</span>
 </>
 ) : (
 <span>Lưu Lô Mail</span>
 )}
 </button>
 </div>
 </form>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}

function formatDate(dateStr: string) {
 if (!dateStr) return"---";
 try {
 const d = new Date(dateStr);
 if (isNaN(d.getTime())) return dateStr;
 const dd = String(d.getDate()).padStart(2, '0');
 const mm = String(d.getMonth() + 1).padStart(2, '0');
 const yyyy = d.getFullYear();
 return `${dd}/${mm}/${yyyy}`;
 } catch {
 return dateStr;
 }
}

interface RangeSelectionModalProps {
  batchId: string;
  onClose: () => void;
  onSelectSuccess: () => void;
}

function RangeSelectionModal({ batchId, onClose, onSelectSuccess }: RangeSelectionModalProps) {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data, error, mutate } = useSWR("/api/admin/mails/available-ranges", fetcher);
  const [isAssigning, setIsAssigning] = useState(false);

  const ranges = Array.isArray(data) ? data : (data?.data || data?.chunks || []);
  const isLoading = !data && !error;

  const handleSelectRange = async (range: any) => {
    if (isAssigning) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/admin/mail/satellite-batches/${batchId}/assign-range`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mailIds: range.mailIds,
          startIndex: range.startIndex,
          endIndex: range.endIndex
        })
      });
      if (res.ok) {
        mutate();
        onSelectSuccess();
        onClose();
      } else {
        const errData = await res.json();
        alert(errData.error || "Gán dải mail thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ!");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-white/10 rounded-[32px] p-8 w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col justify-between overflow-hidden relative">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gold/5 blur-[50px] -mr-20 -mt-20 pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gold/10 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Chọn Dải Mail Từ Kho</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                  Phân chia tự động tối đa 17 mail mỗi dải
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-gray-500 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar min-h-[200px]">
            {isLoading && (
              <div className="h-40 flex flex-col items-center justify-center text-center text-gray-400 gap-2">
                <Loader2 className="animate-spin text-gold" size={28} />
                <span className="text-xs font-bold uppercase tracking-widest">Đang tải dải mail...</span>
              </div>
            )}

            {!isLoading && ranges.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-center text-gray-500">
                <Mail size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-black uppercase tracking-widest">Kho mail trống hoặc đã được gán hết!</p>
              </div>
            )}

            {!isLoading && ranges.map((range: any, idx: number) => (
              <div
                key={idx}
                onClick={() => handleSelectRange(range)}
                className={`p-5 rounded-2xl border bg-white/0 border-white/5 hover:border-gold/30 hover:bg-gold/5 flex items-center justify-between transition-all cursor-pointer group ${
                  isAssigning ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-gold transition-colors">
                    Dải {range.rangeIndex} ( {range.count} mail {range.startIndex} - {range.endIndex} )
                  </h4>
                </div>
                <div className="h-8 px-4 rounded-xl bg-gold/10 text-gold border border-gold/10 group-hover:bg-gold group-hover:text-sidebar text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all">
                  Chọn dải này
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-white/5 border border-white/0 text-white font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-white/10 transition-all"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
