"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Phone, 
  Upload, 
  Users, 
  Calendar, 
  Search,
  CheckCircle2,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Layers,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface PhoneItem {
  id: string;
  number: string;
  status: "Chưa verify" | "XM lần 1" | "XM lần 2" | "Lỗi";
  assigneeId: string;
  assignedTo: string;
  assignedAt: string;
  importBatch: string;
  importedAt: string;
}

export default function PhoneBatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [phones, setPhones] = useState<PhoneItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    // Authenticate
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const role = String(parsedUser.role || "").toUpperCase();
      if (role !== "01" && role !== "02" && role !== "ADMIN" && role !== "QUẢN LÝ CÔNG VIỆC" && role !== "QL CÔNG VIỆC") {
        window.location.href = "/admin";
      }
    } else {
      window.location.href = "/login";
    }

    const loadData = () => {
      // Load phones
      const savedPhones = localStorage.getItem("global_phones_data");
      if (savedPhones) {
        setPhones(JSON.parse(savedPhones));
      } else {
        // Initial seed data of unassigned phones
        const initialPhones: PhoneItem[] = [];
        const batchName = "Lô SĐT Khởi Tạo #001";
        const nowStr = new Date().toISOString().split("T")[0];
        for (let i = 1; i <= 80; i++) {
          const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
          initialPhones.push({
            id: `phone-seed-${i}`,
            number: `09${randomDigits}`,
            status: "Chưa verify",
            assigneeId: "",
            assignedTo: "",
            assignedAt: "",
            importBatch: batchName,
            importedAt: nowStr
          });
        }
        localStorage.setItem("global_phones_data", JSON.stringify(initialPhones));
        setPhones(initialPhones);
      }

      // Load employees (roles 03 and 04)
      const savedUsers = localStorage.getItem("global_users");
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        const filtered = parsedUsers.filter((u: any) => 
          u.role === "03" || u.role === "04" || u.role === "NHÂN VIÊN" || u.role === "QUẢN LÝ NHÂN SỰ"
        );
        setEmployees(filtered);
      }
    };

    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleImportMockExcel = () => {
    const batchNumber = Math.floor(100 + Math.random() * 900);
    const batchName = `Lô SĐT Import Excel #${batchNumber}`;
    const nowStr = new Date().toISOString().split("T")[0];
    const importedList: PhoneItem[] = [];
    
    for (let i = 1; i <= 100; i++) {
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
      importedList.push({
        id: `phone-import-${Date.now()}-${i}`,
        number: `09${randomDigits}`,
        status: "Chưa verify",
        assigneeId: "",
        assignedTo: "",
        assignedAt: "",
        importBatch: batchName,
        importedAt: nowStr
      });
    }

    const updated = [...phones, ...importedList];
    localStorage.setItem("global_phones_data", JSON.stringify(updated));
    setPhones(updated);
    window.dispatchEvent(new Event("storage"));

    // Sync to API
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_phones_data: JSON.stringify(updated) })
    }).catch(() => {});

    // System Log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: "ADMIN",
      action: `Import thành công 100 số điện thoại từ Excel (${batchName})`,
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
    window.dispatchEvent(new Event("storage"));

    triggerToast(`Đã import thành công 100 SĐT mới từ ${batchName}!`);
  };

  const handleAssignPhones = () => {
    if (!selectedEmployee) {
      triggerToast("Vui lòng chọn nhân viên để bàn giao SĐT!");
      return;
    }

    const emp = employees.find(e => e.username === selectedEmployee || String(e.id) === String(selectedEmployee));
    if (!emp) {
      triggerToast("Nhân viên không tồn tại!");
      return;
    }

    // Get unassigned numbers
    const unassigned = phones.filter(p => !p.assigneeId);
    if (unassigned.length < 25) {
      triggerToast(`Kho SĐT không đủ 25 số trống! Hiện chỉ còn ${unassigned.length} số.`);
      return;
    }

    // Take exactly 25
    const toAssign = unassigned.slice(0, 25);
    const assignedIds = new Set(toAssign.map(p => p.id));
    const nowStr = new Date().toISOString().split("T")[0];

    const updatedPhones = phones.map(p => {
      if (assignedIds.has(p.id)) {
        return {
          ...p,
          assigneeId: emp.username,
          assignedTo: emp.name,
          assignedAt: nowStr
        };
      }
      return p;
    });

    localStorage.setItem("global_phones_data", JSON.stringify(updatedPhones));
    setPhones(updatedPhones);
    window.dispatchEvent(new Event("storage"));

    // Sync to API
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_phones_data: JSON.stringify(updatedPhones) })
    }).catch(() => {});

    // Create Notification for the Employee
    const existingNotifs = localStorage.getItem("admin_notifications");
    const notifList = existingNotifs ? JSON.parse(existingNotifs) : [];
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: "Giao Lô Số Điện Thoại",
      message: `Bạn được Admin phân công đúng 25 số điện thoại mới hôm nay để xác minh.`,
      time: new Date().toLocaleTimeString("vi-VN") + " - " + new Date().toLocaleDateString("vi-VN"),
      type: "ASSIGNMENT",
      read: false,
      targetUsername: emp.username
    };
    localStorage.setItem("admin_notifications", JSON.stringify([newNotif, ...notifList]));

    // System Log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: "ADMIN",
      action: `Phân phối 25 SĐT cho nhân viên ${emp.name} (${emp.username})`,
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
    window.dispatchEvent(new Event("storage"));

    triggerToast(`Đã bàn giao đúng 25 số điện thoại cho ${emp.name}!`);
    setSelectedEmployee("");
  };

  // High-level statistics
  const stats = useMemo(() => {
    const total = phones.length;
    const unassigned = phones.filter(p => !p.assigneeId).length;
    const assigned = total - unassigned;
    const xm1 = phones.filter(p => p.status === "XM lần 1").length;
    const xm2 = phones.filter(p => p.status === "XM lần 2").length;
    const errorCount = phones.filter(p => p.status === "Lỗi").length;
    return { total, unassigned, assigned, xm1, xm2, errorCount };
  }, [phones]);

  // Employee breakdown counts
  const employeeStats = useMemo(() => {
    return employees.map(emp => {
      const empPhones = phones.filter(p => p.assigneeId === emp.username);
      const xm1Count = empPhones.filter(p => p.status === "XM lần 1").length;
      const xm2Count = empPhones.filter(p => p.status === "XM lần 2").length;
      const errorCount = empPhones.filter(p => p.status === "Lỗi").length;
      const pendingCount = empPhones.filter(p => p.status === "Chưa verify").length;

      return {
        ...emp,
        assignedCount: empPhones.length,
        xm1Count,
        xm2Count,
        errorCount,
        pendingCount
      };
    });
  }, [phones, employees]);

  const filteredPhones = phones.filter(p => {
    if (!searchTerm) return true;
    return p.number.includes(searchTerm) || 
           (p.assignedTo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           (p.importBatch || "").toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} 
            animate={{ opacity: 1, y: 30, x: "-50%" }} 
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-3 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/admin")}
            className="p-2 rounded-xl bg-sidebar border border-border-custom text-gray-400 hover:text-white transition-all shadow-md"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Phone className="text-gold" size={28} />
              Quản lý phân lô SĐT
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
              Phân chia chính xác 25 số điện thoại cho nhân viên xác minh mỗi ngày
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleImportMockExcel}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase text-xs tracking-widest px-5 h-10 rounded-xl transition-all border border-white/5 flex items-center gap-2 shadow-lg"
          >
            <Upload size={16} />
            Import Excel SĐT
          </button>
        </div>
      </div>

      {/* Premium Dashboard Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tổng kho SĐT</span>
          <span className="text-2xl font-black text-white mt-1">{stats.total} <span className="text-xs text-gray-500">Số</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-gold uppercase tracking-widest">SĐT chưa giao</span>
          <span className="text-2xl font-black text-gold mt-1">{stats.unassigned} <span className="text-xs text-gray-500">Số</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Đang bàn giao</span>
          <span className="text-2xl font-black text-indigo-400 mt-1">{stats.assigned} <span className="text-xs text-gray-500">Số</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">XM lần 1</span>
          <span className="text-2xl font-black text-yellow-500 mt-1">{stats.xm1} <span className="text-xs text-gray-500">Số</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">XM lần 2</span>
          <span className="text-2xl font-black text-green-500 mt-1">{stats.xm2} <span className="text-xs text-gray-500">Số</span></span>
        </div>
        <div className="bg-sidebar/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Bị Lỗi</span>
          <span className="text-2xl font-black text-red-500 mt-1">{stats.errorCount} <span className="text-xs text-gray-500">Số</span></span>
        </div>
      </div>

      {/* Main Grid: Assignment Panel & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Assignment form (Glass panel) */}
        <div className="lg:col-span-4 bg-sidebar border border-white/5 rounded-[32px] p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Bàn giao SĐT</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cấp phát chính xác 25 SĐT trống</p>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Select employee */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Chọn nhân sự</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-xs text-gold font-bold uppercase tracking-wider focus:border-gold/50 outline-none transition-all cursor-pointer"
            >
              <option value="" className="bg-sidebar text-white">-- click chọn nhân sự --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.username} className="bg-sidebar text-white">
                  {emp.name} ({emp.username})
                </option>
              ))}
            </select>
          </div>

          {/* Guidelines Box */}
          <div className="bg-gold/5 border border-gold/10 rounded-2xl p-4 text-[11px] text-gray-400 font-medium leading-relaxed space-y-2">
            <div className="flex gap-2 text-gold font-black uppercase text-[10px] tracking-widest items-center">
              <AlertTriangle size={13} />
              <span>Quy tắc nghiệp vụ</span>
            </div>
            <p>Mỗi nhân viên nhận việc sẽ được phân phối <span className="text-gold font-black">đúng 25 số điện thoại</span> chưa được giao từ Kho tổng.</p>
            <p>Sau khi được giao, nhân viên sẽ thấy danh sách trong mục <span className="text-white font-bold">"Danh sách SĐT"</span> của họ.</p>
          </div>

          {/* Action button */}
          <button
            onClick={handleAssignPhones}
            disabled={!selectedEmployee || stats.unassigned < 25}
            className="w-full h-12 rounded-xl bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-gold/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <TrendingUp size={16} />
            Bàn giao 25 SĐT
          </button>
        </div>

        {/* Right Col: Staff & Phone details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Employee assignment summary */}
          <div className="bg-sidebar border border-white/5 rounded-[32px] p-6 shadow-xl space-y-4">
            <h3 className="text-md font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Users size={18} className="text-gold" />
              Tình trạng bàn giao SĐT nhân viên
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase font-black text-[9px] tracking-wider">
                    <th className="py-2.5">Nhân viên</th>
                    <th className="py-2.5 text-center">Đã giao (Hôm nay)</th>
                    <th className="py-2.5 text-center text-yellow-500">XM lần 1</th>
                    <th className="py-2.5 text-center text-green-500">XM lần 2</th>
                    <th className="py-2.5 text-center text-red-500">Lỗi</th>
                    <th className="py-2.5 text-center text-gray-400">Chưa làm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 font-bold">
                  {employeeStats.map((emp) => (
                    <tr key={emp.id} className="hover:bg-white/[0.01]">
                      <td className="py-3">
                        <div className="font-bold text-white">{emp.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">@{emp.username}</div>
                      </td>
                      <td className="py-3 text-center text-indigo-400 text-sm font-black">{emp.assignedCount} số</td>
                      <td className="py-3 text-center text-yellow-500 font-mono">{emp.xm1Count}</td>
                      <td className="py-3 text-center text-green-500 font-mono">{emp.xm2Count}</td>
                      <td className="py-3 text-center text-red-500 font-mono">{emp.errorCount}</td>
                      <td className="py-3 text-center text-gray-400 font-mono">{emp.pendingCount}</td>
                    </tr>
                  ))}
                  {employeeStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-600 font-bold uppercase tracking-widest">
                        Chưa có nhân viên nào trên hệ thống
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phone list explorer */}
          <div className="bg-sidebar border border-white/5 rounded-[32px] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-md font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Phone size={18} className="text-gold" />
                Danh sách chi tiết SĐT trong kho
              </h3>

              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
                <input 
                  placeholder="Tìm SĐT, Nhân viên, Lô..."
                  className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 h-9 text-xs text-white outline-none focus:border-gold/50 transition-all w-full sm:w-60"
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[350px] custom-scrollbar border border-white/5 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0c0c0c] text-gray-500 uppercase font-black text-[9px] tracking-wider z-10 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Lô Import</th>
                    <th className="py-3 px-4">Người xác minh</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredPhones.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.01]">
                      <td className="py-3 px-4 font-bold text-white font-mono text-sm">{p.number}</td>
                      <td className="py-3 px-4 text-gray-400">{p.importBatch}</td>
                      <td className="py-3 px-4">
                        {p.assignedTo ? (
                          <div>
                            <div className="font-bold text-gray-300">{p.assignedTo}</div>
                            <div className="text-[10px] text-gray-500 font-mono">@{p.assigneeId}</div>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic">Chưa bàn giao</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          p.status === "XM lần 1" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" : 
                          p.status === "XM lần 2" ? "bg-green-500/10 text-green-500 border border-green-500/20" : 
                          p.status === "Lỗi" ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
                          "bg-gray-500/10 text-gray-400 border border-white/5"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredPhones.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">
                        Không tìm thấy số điện thoại nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
