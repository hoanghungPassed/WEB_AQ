import os

file_path = r"c:\Users\HoangHung\Documents\GitHub\WEB_AQ\src\app\admin\mail\batches\page.tsx"

with open(file_path, "rb") as f:
    raw_content = f.read()

content = raw_content.decode("utf-8").replace("\r\n", "\n")

replacements = []

# Replacement 1: BatchItem interface
r1_target = """interface BatchItem {
 id: string;
 name: string;
 type:"ROOT" |"SATELLITE" |"MONETIZED";
 importedAt: string;
 mailCount: number;
 importedBy: string;
 assignedTo?: string;
}"""

r1_replacement = """interface BatchItem {
 id: string;
 name: string;
 type:"ROOT" |"SATELLITE" |"MONETIZED";
 importedAt: string;
 mailCount: number;
 importedBy: string;
 assignedTo?: string;
 assignedCount?: number;
 unassignedCount?: number;
}"""
replacements.append((r1_target, r1_replacement))

# Replacement 2: loadBatches and Auth effect
r2_target = """ useEffect(() => {
 // Authenticate Roles
 const storedUser = sessionStorage.getItem("user");
 if (storedUser) {
 const parsedUser = JSON.parse(storedUser);
 setUser(parsedUser);
 const role = String(parsedUser.role ||"").toUpperCase();
 if (role !=="01" && role !=="02" && role !=="ADMIN" && role !=="QUẢN LÝ CÔNG VIỆC" && role !=="QL CÔNG VIỆC") {
 window.location.href ="/admin";
 }
 } else {
 window.location.href ="/login";
 }

 const loadBatches = async () => {
 try {
 const res = await fetch("/api/admin/mails");
 const data = await res.json();
 const mails = data.success && data.data ? data.data : [];

 const batchesMap: Record<string, BatchItem> = {};
 mails.forEach((m: any) => {
 if (m.batchName) {
 const key = m.batchId || `${m.type}-${m.batchName}`;
 if (!batchesMap[key]) {
 batchesMap[key] = {
 id: m.batchId || `batch-seed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
 name: m.batchName,
 type: m.type as any,
 importedAt: m.createdAt || new Date().toISOString().split("T")[0],
 mailCount: 0,
 importedBy: m.importedBy || m.updatedBy ||"Admin",
 assignedTo: m.assignedTo ||"Chưa phân công"
 };
 }
 batchesMap[key].mailCount++;
 if (m.assignedTo && batchesMap[key].assignedTo ==="Chưa phân công") {
 batchesMap[key].assignedTo = m.assignedTo;
 }
 }
 });
 const derivedBatches = Object.values(batchesMap);
 setBatches(derivedBatches);

 const userRes = await fetch("/api/admin/users");
 if (userRes.ok) {
 const userData = await userRes.json();
 const list = userData.data || [];
 const filtered = list.filter((u: any) => u.role ==="04" || u.role ==="05" || u.role ==="03" || u.role ==="NHÂN VIÊN" || u.role ==="NV THỬ VIỆC" || u.role ==="QUẢN LÝ NHÂN SỰ");
 setStaffList(filtered);
 }
 } catch (err) {
 console.error("Lỗi khi load batches từ API", err);
 }
 };

 loadBatches();
 }, []);"""

r2_replacement = """ const loadBatches = async () => {
 try {
 const res = await fetch("/api/admin/mails?limit=10000");
 const data = await res.json();
 const mails = data.success && data.data ? data.data : [];

 const batchesMap: Record<string, { item: BatchItem; assignees: Set<string>; assignedCount: number; unassignedCount: number }> = {};
 mails.forEach((m: any) => {
 const originalBatchName = m.batch || m.batchName;
 if (originalBatchName) {
 const key = `${m.type}-${originalBatchName}`;
 if (!batchesMap[key]) {
 batchesMap[key] = {
 item: {
 id: key,
 name: originalBatchName,
 type: m.type as any,
 importedAt: m.createdAt || new Date().toISOString().split("T")[0],
 mailCount: 0,
 importedBy: m.importedBy || m.updatedBy || "Admin",
 assignedTo: "Chưa phân công"
 },
 assignees: new Set<string>(),
 assignedCount: 0,
 unassignedCount: 0
 };
 }
 batchesMap[key].item.mailCount++;
 if (m.assignedTo) {
 batchesMap[key].assignees.add(m.assignedTo);
 batchesMap[key].assignedCount++;
 } else {
 batchesMap[key].unassignedCount++;
 }
 }
 });
 const derivedBatches = Object.values(batchesMap).map(({ item, assignees, assignedCount, unassignedCount }) => {
 if (assignees.size > 0) {
 item.assignedTo = Array.from(assignees).join(", ");
 } else {
 item.assignedTo = "Chưa phân công";
 }
 item.assignedCount = assignedCount;
 item.unassignedCount = unassignedCount;
 return item;
 });
 setBatches(derivedBatches);

 const userRes = await fetch("/api/admin/users");
 if (userRes.ok) {
 const userData = await userRes.json();
 const list = userData.data || [];
 const filtered = list.filter((u: any) => u.role ==="04" || u.role ==="05" || u.role ==="03" || u.role ==="NHÂN VIÊN" || u.role ==="NV THỬ VIỆC" || u.role ==="QUẢN LÝ NHÂN SỰ");
 setStaffList(filtered);
 }
 } catch (err) {
 console.error("Lỗi khi load batches từ API", err);
 }
 };

 useEffect(() => {
 // Authenticate Roles
 const storedUser = sessionStorage.getItem("user");
 if (storedUser) {
 const parsedUser = JSON.parse(storedUser);
 setUser(parsedUser);
 const role = String(parsedUser.role ||"").toUpperCase();
 if (role !=="01" && role !=="02" && role !=="ADMIN" && role !=="QUẢN LÝ CÔNG VIỆC" && role !=="QL CÔNG VIỆC") {
 window.location.href ="/admin";
 }
 } else {
 window.location.href ="/login";
 }

 loadBatches();
 }, []);"""
replacements.append((r2_target, r2_replacement))

# Replacement 3: showAssignModal SWR fetch
r3_target = """ useEffect(() => {
 if (showAssignModal) {
 fetch("/api/admin/mails").then(res => res.json()).then(data => {
 if (data.success) setAllMailsForPreview(data.data || []);
 }).catch(console.error);
 }
 }, [showAssignModal]);"""

r3_replacement = """ useEffect(() => {
 if (showAssignModal) {
 fetch("/api/admin/mails?limit=10000").then(res => res.json()).then(data => {
 if (data.success) setAllMailsForPreview(data.data || []);
 }).catch(console.error);
 }
 }, [showAssignModal]);"""
replacements.append((r3_target, r3_replacement))

# Replacement 4: assignmentPreview calculation
r4_target = """ const assignmentPreview = useMemo(() => {
 if (!showAssignModal) return null;
 const satelliteMails = allMailsForPreview.filter((m: any) => m.type ==="SATELLITE");
 
 // Find first block of 17 unassigned mails
 const unassigned = (satelliteMails || []).filter((m: any) => !m.assigneeId);
 
 // Take first 17
 const range = unassigned.slice(0, 17);
 if ((range || []).length === 0) {
 return {
 mailsToAssign: [],
 displayText:"Kho mail vệ tinh không còn mail nào trống!",
 count: 0
 };
 }
 
 const firstSTT = range[0].id - 1000;
 const lastSTT = range[(range || []).length - 1].id - 1000;
 
 return {
 mailsToAssign: range,
 displayText: `Chọn mail: ${(range || []).length} mail (${firstSTT} đến ${lastSTT})`,
 count: (range || []).length
 };
 }, [showAssignModal, batches]);"""

r4_replacement = """ const assignmentPreview = useMemo(() => {
 if (!showAssignModal) return null;
 const satelliteMails = allMailsForPreview.filter((m: any) => m.type === "SATELLITE");
 
 // Find first block of 17 unassigned mails
 const unassigned = (satelliteMails || []).filter((m: any) => !m.assigneeId);
 
 // Take first 17
 const range = unassigned.slice(0, 17);
 if ((range || []).length === 0) {
 return {
 mailsToAssign: [],
 displayText: "Kho mail vệ tinh không còn mail nào trống!",
 count: 0
 };
 }
 
 const firstSTT = range[0].stt || range[0].id || range[0]._id || 0;
 const lastSTT = range[(range || []).length - 1].stt || range[(range || []).length - 1].id || range[(range || []).length - 1]._id || 0;
 
 return {
 mailsToAssign: range,
 displayText: `Chọn mail: ${(range || []).length} mail (STT ${firstSTT} đến ${lastSTT})`,
 count: (range || []).length
 };
 }, [showAssignModal, allMailsForPreview]);"""
replacements.append((r4_target, r4_replacement))

# Replacement 5: handleAssignBatch
r5_target = """ const handleAssignBatch = async () => {
 if (!selectedStaffForAssign) {
 triggerToast("Vui lòng chọn nhân viên nhận việc trước!");
 return;
 }
 if (!assignmentPreview || assignmentPreview.count === 0) {
 triggerToast("Không có dải mail trống nào để gán!");
 return;
 }
 
 const staff = staffList.find(s => String(s.id) === String(selectedStaffForAssign) || s.username === selectedStaffForAssign);
 if (!staff) {
 triggerToast("Nhân viên không tồn tại!");
 return;
 }
 
 const targetIds = Array.from(new Set((assignmentPreview.mailsToAssign || []).map((m: any) => m.id)));
 const now = new Date().toISOString();
 
 // Call batch update API
 try {
 const res = await fetch("/api/admin/mails/batch-update", {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 ids: targetIds,
 updateData: {
 assigneeId: staff.id || staff.username,
 assignedTo: staff.name,
 batchName: selectedBatchNameForAssign,
 batchId: `batch-${selectedBatchNameForAssign.replace(/\\s+/g, '-')}`,
 updatedBy: user?.name ||"Admin"
 }
 })
 });

 if (res.ok) {
 setShowAssignModal(false);
 triggerToast(`Gán thành công ${assignmentPreview.count} mail cho ${staff.name}!`);
 } else {
 const errData = await res.json().catch(() => ({}));
 triggerToast(errData.error ||"Gán thất bại");
 }
 } catch (e) {
 console.error(e);
 triggerToast("Gán thất bại");
 }
 };"""

# Note: In the handleAssignBatch target query on line 182, let's fetch handleAssignBatch with exact substring search.
# Wait, let's see how handled in python content search
# Let's read handleAssignBatch exactly from inspect output:
# Line 182 in inspect output: ' batchId: `batch-${selectedBatchNameForAssign.replace(/\\s+/g, \'-\').toLowerCase()}`,' -> wait, it has .toLowerCase()!
# Ah! In my r5_target, I wrote: `batchId: `batch-${selectedBatchNameForAssign.replace(/\\s+/g, '-')}` without `.toLowerCase()`.
# That is why it didn't match handleAssignBatch!
# Let's fix that.

r5_target = """ const handleAssignBatch = async () => {
 if (!selectedStaffForAssign) {
 triggerToast("Vui lòng chọn nhân viên nhận việc trước!");
 return;
 }
 if (!assignmentPreview || assignmentPreview.count === 0) {
 triggerToast("Không có dải mail trống nào để gán!");
 return;
 }
 
 const staff = staffList.find(s => String(s.id) === String(selectedStaffForAssign) || s.username === selectedStaffForAssign);
 if (!staff) {
 triggerToast("Nhân viên không tồn tại!");
 return;
 }
 
 const targetIds = Array.from(new Set((assignmentPreview.mailsToAssign || []).map((m: any) => m.id)));
 const now = new Date().toISOString();
 
 // Call batch update API
 try {
 const res = await fetch("/api/admin/mails/batch-update", {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 ids: targetIds,
 updateData: {
 assigneeId: staff.id || staff.username,
 assignedTo: staff.name,
 batchName: selectedBatchNameForAssign,
 batchId: `batch-${selectedBatchNameForAssign.replace(/\\s+/g, '-').toLowerCase()}`,
 updatedBy: user?.name ||"Admin"
 }
 })
 });

 if (res.ok) {
 setShowAssignModal(false);
 triggerToast(`Gán thành công ${assignmentPreview.count} mail cho ${staff.name}!`);
 } else {
 const errData = await res.json().catch(() => ({}));
 triggerToast(errData.error ||"Gán thất bại");
 }
 } catch (e) {
 console.error(e);
 triggerToast("Gán thất bại");
 }
 };"""

r5_replacement = """ const handleAssignBatch = async () => {
 if (!selectedStaffForAssign) {
 triggerToast("Vui lòng chọn nhân viên nhận việc trước!");
 return;
 }
 if (!assignmentPreview || assignmentPreview.count === 0) {
 triggerToast("Không có dải mail trống nào để gán!");
 return;
 }
 
 const staff = staffList.find(s => String(s.id) === String(selectedStaffForAssign) || s.username === selectedStaffForAssign);
 if (!staff) {
 triggerToast("Nhân viên không tồn tại!");
 return;
 }
 
 const targetIds = Array.from(new Set((assignmentPreview.mailsToAssign || []).map((m: any) => m._id || m.id)));
 
 // Call batch update API
 try {
 const res = await fetch("/api/admin/mails/batch-update", {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 ids: targetIds,
 updateData: {
 assigneeId: staff.id || staff.username,
 assignedTo: staff.name,
 batchName: selectedBatchNameForAssign,
 batchId: `batch-${selectedBatchNameForAssign.replace(/\\s+/g, '-').toLowerCase()}`,
 updatedBy: user?.name || "Admin"
 }
 })
 });

 if (res.ok) {
 setShowAssignModal(false);
 triggerToast(`Gán thành công ${assignmentPreview.count} mail cho ${staff.name}!`);
 loadBatches(); // Refresh UI state immediately!
 } else {
 const errData = await res.json().catch(() => ({}));
 triggerToast(errData.error ||"Gán thất bại");
 }
 } catch (e) {
 console.error(e);
 triggerToast("Gán thất bại");
 }
 };"""
replacements.append((r5_target, r5_replacement))

# Replacement 6: loadDetailMails
r6_target = """ useEffect(() => {
 if (!selectedBatchForDetail) return;
 const loadDetailMails = async () => {
 try {
 const res = await fetch("/api/admin/mails");
 const data = await res.json();
 const mails = data.success && data.data ? data.data : [];
 const filtered = mails.filter((m: any) => m.batchId === selectedBatchForDetail.id || m.batchName === selectedBatchForDetail.name);
 // Sort by STT
 filtered.sort((a: any, b: any) => {
 const aStt = a.stt || a.id || 0;
 const bStt = b.stt || b.id || 0;
 return aStt - bStt;
 });
 setDetailMails(filtered);
 } catch (e) {
 console.error("Lỗi khi load detail mails", e);
 }
 };
 loadDetailMails();
 // Re-fetch when localStorage changes (optional but good for sync)
 window.addEventListener("storage", loadDetailMails);
 return () => window.removeEventListener("storage", loadDetailMails);
 }, [selectedBatchForDetail]);"""

r6_replacement = """ useEffect(() => {
 if (!selectedBatchForDetail) return;
 const loadDetailMails = async () => {
 try {
 const res = await fetch(`/api/admin/mails?batch=${encodeURIComponent(selectedBatchForDetail.name)}&limit=10000`);
 const data = await res.json();
 const filtered = data.success && data.data ? data.data : [];
 // Sort by STT
 filtered.sort((a: any, b: any) => {
 const aStt = a.stt || 0;
 const bStt = b.stt || 0;
 return aStt - bStt;
 });
 setDetailMails(filtered);
 } catch (e) {
 console.error("Lỗi khi load detail mails", e);
 }
 };
 loadDetailMails();
 // Re-fetch when localStorage changes (optional but good for sync)
 window.addEventListener("storage", loadDetailMails);
 return () => window.removeEventListener("storage", loadDetailMails);
 }, [selectedBatchForDetail]);"""
replacements.append((r6_target, r6_replacement))

# Replacement 7: handleConfirmDelete checks
r7_target = """ const handleConfirmDelete = async () => {
 if (!batchToDelete) return;

 try {
 const queryParams = new URLSearchParams();
 if (batchToDelete.id && !batchToDelete.id.startsWith("batch-seed-")) {
 queryParams.append("batchId", batchToDelete.id);
 } else {
 queryParams.append("batchName", batchToDelete.name);
 }"""

r7_replacement = """ const handleConfirmDelete = async () => {
 if (!batchToDelete) return;

 try {
 const queryParams = new URLSearchParams();
 if (batchToDelete.id && !batchToDelete.id.startsWith("batch-seed-") && !batchToDelete.id.includes("-")) {
 queryParams.append("batchId", batchToDelete.id);
 } else {
 queryParams.append("batchName", batchToDelete.name);
 }"""
replacements.append((r7_target, r7_replacement))

# Replacement 8: Batch Card Counter
r8_target = """ {/* Dynamic Graphic Counter */}
 <div className="flex items-baseline gap-1.5 my-3 bg-black/10 rounded-xl p-3 border border-white/0">
 <span className="text-3xl font-black text-gold tracking-tighter leading-none">{batch.mailCount}</span>
 <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Tài khoản Mail</span>
 </div>"""

r8_replacement = """ {/* Dynamic Graphic Counter */}
 <div className="flex flex-col gap-2 my-3 bg-black/10 rounded-xl p-3 border border-white/0">
 <div className="flex items-baseline gap-1.5">
 <span className="text-3xl font-black text-gold tracking-tighter leading-none">{batch.mailCount}</span>
 <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Tổng số Mail</span>
 </div>
 <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-t border-white/5 pt-2">
 <span className="text-green-400">Đã giao: {batch.assignedCount || 0}</span>
 <span className="text-yellow-500">Tồn kho: {batch.unassignedCount || 0}</span>
 </div>
 </div>"""
replacements.append((r8_target, r8_replacement))

# Replacement 9: Details Table headers
r9_target = """ <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">STT</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Email</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Recovery (KP)</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Pass</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">2FA</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">SĐT</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Link OTP</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Hệ thống</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Công việc</th>"""

r9_replacement = """ <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">STT</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Email</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Recovery (KP)</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Pass</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">2FA</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">SĐT</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Link OTP</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Người nhận / Lô gán</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Hệ thống</th>
 <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Công việc</th>"""
replacements.append((r9_target, r9_replacement))

# Replacement 10: Details Table Row
r10_target = """ <td className="py-3 px-4">
 {mail.otpLink ? (
 <a href={mail.otpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link OTP</a>
 ) : <span className="">---</span>}
 </td>
 <td className="py-3 px-4 text-center">
 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mail.status ==="LIVE" ?"bg-green-500/10 text-green-500 border border-green-500/20" :"bg-red-500/10 text-red-500 border border-red-500/20"}`}>
 {mail.status ||"LIVE"}
 </span>
 </td>
 <td className="py-3 px-4 text-center">
 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mail.workStatus ==="Đã làm" || mail.workStatus ==="Đã bán" ?"bg-green-500/10 text-green-500" : mail.workStatus ==="Đang xử lí" ?"bg-yellow-500/10 text-yellow-500" : mail.workStatus ==="Lỗi" ?"bg-red-500/10 text-red-500" :"bg-gray-500/10 text-gray-400"}`}>
 {mail.workStatus ||"Chưa làm"}
 </span>
 </td>"""

r10_replacement = """ <td className="py-3 px-4">
 {mail.otpLink ? (
 <a href={mail.otpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link OTP</a>
 ) : <span className="">---</span>}
 </td>
 <td className="py-3 px-4 text-center text-xs font-bold text-gray-400">
 {mail.assignedTo ? f"{mail.assignedTo} ({mail.batchName || 'Không rõ'})" : 'Chưa phân công'}
 </td>
 <td className="py-3 px-4 text-center">
 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mail.status ==="LIVE" ?"bg-green-500/10 text-green-500 border border-green-500/20" :"bg-red-500/10 text-red-500 border border-red-500/20"}`}>
 {mail.status ||"LIVE"}
 </span>
 </td>
 <td className="py-3 px-4 text-center">
 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mail.workStatus ==="Đã làm" || mail.workStatus ==="Đã bán" ?"bg-green-500/10 text-green-500" : mail.workStatus ==="Đang xử lí" ?"bg-yellow-500/10 text-yellow-500" : mail.workStatus ==="Lỗi" ?"bg-red-500/10 text-red-500" :"bg-gray-500/10 text-gray-400"}`}>
 {mail.workStatus ||"Chưa làm"}
 </span>
 </td>"""
replacements.append((r10_target, r10_replacement))

# Replacement 11: Colspan empty state
r11_target = """ {(detailMails || []).length === 0 && (
 <tr>
 <td colSpan={9} className="py-10 text-center font-bold uppercase tracking-widest">Không có mail nào trong lô này</td>
 </tr>
 )}"""

r11_replacement = """ {(detailMails || []).length === 0 && (
 <tr>
 <td colSpan={10} className="py-10 text-center font-bold uppercase tracking-widest">Không có mail nào trong lô này</td>
 </tr>
 )}"""
replacements.append((r11_target, r11_replacement))

failed = False
for idx, (target, replacement) in enumerate(replacements):
    if target not in content:
        print(f"ERROR: Replacement {idx + 1} not found in content!")
        failed = True
    else:
        content = content.replace(target, replacement)

if not failed:
    with open(file_path, "wb") as f:
        # Re-convert to CRLF for windows consistency before writing
        f.write(content.replace("\n", "\r\n").encode("utf-8"))
    print("SUCCESS: All replacements applied successfully!")
else:
    print("FAILURE: Script exited without writing changes due to errors.")
