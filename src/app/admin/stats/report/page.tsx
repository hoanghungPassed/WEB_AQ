"use client";

import React, { useState, useEffect, useMemo } from"react";
import { 
 ArrowLeft, 
 BarChart3, 
 Download, 
 CheckCircle2, 
 TrendingUp, 
 Award, 
 Clock, 
 UserCheck, 
 Zap,
 Activity,
 Save,
 Calculator,
 Banknote,
 CalendarDays,
 Printer
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";

interface StaffPerformance {
 rank: number;
 name: string;
 username: string;
 assigned: number;
 completed: number;
 errorRate: number;
 kpiProgress: number;
 efficiency: string;
 weeklyChannels: number;
 monthlyChannels: number;
}

export default function ReportsPage() {
 const router = useRouter();
 const [user, setUser] = useState<any>(null);
 const [mails, setMails] = useState<any[]>([]);
 const [staffList, setStaffList] = useState<any[]>([]);
 const [toastMsg, setToastMsg] = useState("");
 const [activeTab, setActiveTab] = useState<"STATS" |"PAYROLL">("STATS");

 // Payroll States
 const [selectedStaffId, setSelectedStaffId] = useState("");
 const [baseSalary, setBaseSalary] = useState("5000000");
 const [allowance, setAllowance] = useState("500000");
 const [payrollRecords, setPayrollRecords] = useState<any[]>([]);

 useEffect(() => {
 // Authenticate Roles
 // Authenticate Roles
 const storedUser = sessionStorage.getItem("user");
 if (storedUser) {
 const parsedUser = JSON.parse(storedUser);
 setUser(parsedUser);
 const role = String(parsedUser.role ||"").toUpperCase();
 if (role !=="01" && role !=="02" && role !=="ADMIN" && role !=="QUẢN LÝ CÔNG VIỆC" && role !=="QL CÔNG VIỆC") {
 router.push("/admin");
 }
 } else {
 router.push("/login");
 }

 const loadData = async () => {
 try {
 const res = await fetch("/api/admin/kpis");
 const data = res.ok ? await res.json() : null;
 if (data) {
 setMails(data.mails || []);
 setStaffList(data.staff || []);
 setPayrollRecords(data.payrollRecords || []);
 } else {
 setMails([]);
 setStaffList([]);
 setPayrollRecords([]);
 }
 } catch (error) {
 console.error("Failed to fetch kpis", error);
 setMails([]);
 setStaffList([]);
 setPayrollRecords([]);
 }
 };

 loadData();
 }, []);

 const triggerToast = (msg: string) => {
 setToastMsg(msg);
 setTimeout(() => setToastMsg(""), 3000);
 };

 const handleExportReport = () => {
    triggerToast("Đang kết xuất báo cáo thống kê chu kỳ... Đã xuất file CSV!");
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Get current week's Monday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    let csvContent = "STT,Nhân viên,Username,Chỉ tiêu ngày,Kênh đủ giờ (Tuần),Tổng tháng (Kênh đủ giờ),KPI Tuần (%),Xếp loại\n";
    
    const eligibleStaffList = (staffList || []).filter((s: any) => s.role === "04" || s.role === "05" || s.role === "NHÂN VIÊN" || s.role === "NV THỬ VIỆC");
    
    // Sort staff members by their monthly channel output
    const calculatedStaff = (eligibleStaffList || []).map((staff: any) => {
      const myMails = (mails || []).filter(m => String(m.assigneeId) === String(staff.id));
      
      const weeklyMails = myMails.filter(m => !m.updatedAt || new Date(m.updatedAt) >= monday);
      
      const eligibleChannelsWeekly = weeklyMails.filter(m => m.type === "SATELLITE").reduce((sum, m) => {
        return sum + ((Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0));
      }, 0);

      const eligibleChannelsMonthly = myMails.filter(m => {
        if (m.type !== "SATELLITE" || !m.updatedAt) return false;
        const d = new Date(m.updatedAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, m) => {
        return sum + ((Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0));
      }, 0);

      const targetWeekly = 300;
      const progress = Math.round((eligibleChannelsWeekly / targetWeekly) * 100);
      
      let efficiency = "C";
      if (progress >= 90) efficiency = "A+";
      else if (progress >= 75) efficiency = "A";
      else if (progress >= 50) efficiency = "B";

      return {
        name: staff.name,
        username: staff.username,
        weekly: eligibleChannelsWeekly,
        monthly: eligibleChannelsMonthly,
        progress,
        efficiency
      };
    }).sort((a, b) => b.monthly - a.monthly);

    calculatedStaff.forEach((staff, idx) => {
      csvContent += `${idx + 1},"${staff.name}","${staff.username}","50 / ngày",${staff.weekly},${staff.monthly},"${staff.progress}%","${staff.efficiency}"\n`;
    });

    const element = document.createElement("a");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {type: 'text/csv;charset=utf-8;'});
    element.href = URL.createObjectURL(blob);
    element.download = `AQ_MEDIA_REPORT_MONTHLY_${currentMonth + 1}_${currentYear}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportExcel = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const res = await fetch('/api/admin/stats/export');
      if (!res.ok) {
        triggerToast('Xuất Excel thất bại');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AQ_MEDIA_REPORT_MONTHLY_${currentMonth + 1}_${currentYear}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      triggerToast('Đã xuất file Excel!');
    } catch (e) {
      console.error(e);
      triggerToast('Lỗi khi xuất Excel');
    }
  };

 // 1. CALCULATE HIGH LEVEL STATS
 const stats = useMemo(() => {
 const total = (mails || []).length || 300;
 const roots = (mails || []).filter(m => m.type ==="ROOT");
 const satellites = (mails || []).filter(m => m.type ==="SATELLITE");
 const monetized = (mails || []).filter(m => m.type ==="MONETIZED");

 const rootDone = (roots || []).filter(m => m.verificationStatus ==="Quét CCCD").length;
 const satelliteDone = (satellites || []).filter(m => m.workStatus ==="Đã làm").length;
 const monetizedDone = (monetized || []).filter(m => m.workStatus ==="Đã bán").length;

 const totalDone = rootDone + satelliteDone + monetizedDone;
 const completionRate = total > 0 ? ((totalDone / total) * 100).toFixed(1) :"0.0";
 
 const liveMails = (mails || []).filter(m => m.status ==="LIVE").length;
 const dieMails = (mails || []).filter(m => m.status ==="DIE").length;
 const liveRatio = total > 0 ? ((liveMails / total) * 100).toFixed(1) :"100.0";

 return {
 total,
 roots: (roots || []).length,
 satellites: (satellites || []).length,
 monetized: (monetized || []).length,
 totalDone,
 completionRate,
 liveRatio,
 dieMails
 };
 }, [mails]);

  // 1.5. CALCULATE CUMULATIVE OUTPUT DATA FOR CURRENT MONTH
  const monthlyCumulativeData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Initialize daily eligible channels counts
    const dailyCounts = Array(daysInMonth).fill(0);
    
    (mails || []).forEach(m => {
      if (m.type === "SATELLITE" && m.updatedAt) {
        const date = new Date(m.updatedAt);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          const day = date.getDate();
          const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
          dailyCounts[day - 1] += count;
        }
      }
    });
    
    // Calculate cumulative counts
    let cumulativeSum = 0;
    const cumulative = dailyCounts.map(count => {
      cumulativeSum += count;
      return cumulativeSum;
    });
    
    return {
      daysInMonth,
      cumulative,
      total: cumulativeSum
    };
  }, [mails]);

  const chartSvgData = useMemo(() => {
    const { daysInMonth, cumulative, total } = monthlyCumulativeData;
    const maxVal = Math.max(10, total);
    
    const width = 500;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const points = cumulative.map((val, idx) => {
      const x = paddingLeft + idx * (chartWidth / (daysInMonth - 1));
      const y = height - paddingBottom - (val / maxVal) * chartHeight;
      return { x, y, val, day: idx + 1 };
    });
    
    if (points.length === 0) return { linePath: "", areaPath: "", points: [], maxVal };
    
    // Build line path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Build area path
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    
    return {
      linePath,
      areaPath,
      points,
      maxVal
    };
  }, [monthlyCumulativeData]);

  const xAxisLabels = useMemo(() => {
    const { daysInMonth } = monthlyCumulativeData;
    const labels = [];
    const step = Math.ceil(daysInMonth / 6);
    for (let i = 0; i < daysInMonth; i += step) {
      labels.push(i + 1);
    }
    if (labels[labels.length - 1] !== daysInMonth) {
      labels.push(daysInMonth);
    }
    return labels;
  }, [monthlyCumulativeData]);

 // 2. CALCULATE STAFF LEADERBOARDS (WEEKLY RESET)
 const staffLeaderboard = useMemo<StaffPerformance[]>(() => {
 const list = (staffList || []).filter((s: any) => s.role ==="04" || s.role ==="05" || s.role ==="NHÂN VIÊN" || s.role ==="NV THỬ VIỆC");
 
 // Get current week's Monday
 const now = new Date();
 const dayOfWeek = now.getDay();
 const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
 const monday = new Date(now.setDate(diff));
 monday.setHours(0, 0, 0, 0);

 const calculated = (list || []).map((staff: any, idx: number) => {
 // Filter mails updated this week
 const myMails = (mails || []).filter(m => {
 if (String(m.assigneeId) !== String(staff.id)) return false;
 if (!m.updatedAt) return true; // fallback
 return new Date(m.updatedAt) >= monday;
 });

 const currentMonth = new Date().getMonth();
 const currentYear = new Date().getFullYear();

 const monthlyMails = (mails || []).filter(m => {
 if (String(m.assigneeId) !== String(staff.id)) return false;
 if (!m.updatedAt) return false;
 const d = new Date(m.updatedAt);
 return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
 });

 const eligibleChannelsMonthly = monthlyMails.filter(m => m.type ==="SATELLITE").reduce((sum, m) => {
    const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
    return sum + count;
  }, 0);

  const eligibleChannelsWeekly = (myMails || []).filter(m => m.type ==="SATELLITE").reduce((sum, m) => {
    const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
    return sum + count;
  }, 0);

 const targetWeekly = 300; // 50 channels per day -> 300 channels per week
 const progress = targetWeekly > 0 ? Math.round((eligibleChannelsWeekly / targetWeekly) * 100) : 0;
 
 const completed = (myMails || []).filter(m => m.workStatus ==="Đã làm" || m.workStatus ==="Đã bán").length;
 const failed = (myMails || []).filter(m => m.workStatus ==="Lỗi").length;
 
 const errorPercent = (myMails || []).length > 0 ? Math.round((failed / (myMails || []).length) * 100) : 0;
 
 let efficiency ="C";
 if (progress >= 90) efficiency ="A+";
 else if (progress >= 75) efficiency ="A";
 else if (progress >= 50) efficiency ="B";

 return {
 rank: 0, // Placeholder
 name: staff.name,
 username: staff.username,
 assigned: (myMails || []).length,
 completed: completed, // We can reuse this or show channels
 errorRate: errorPercent,
 kpiProgress: progress, // Percentage
 efficiency,
 weeklyChannels: eligibleChannelsWeekly,
 monthlyChannels: eligibleChannelsMonthly
 };
 });

 // Sort by KPI progress descending
 const sorted = [...calculated].sort((a, b) => b.kpiProgress - a.kpiProgress);
 return (sorted || []).map((s, idx) => ({ ...s, rank: idx + 1, efficiency: idx === 0 ?"A+" : idx === 1 ?"A" : s.efficiency }));
 }, [staffList, mails]);

 const getAttendanceDays = (username: string) => {
 // Moved to backend / API, defaulting to 26 for now
 return 26;
 };

 const handleSavePayroll = () => {
 if (!selectedStaffId) {
 triggerToast("Vui lòng chọn nhân viên!");
 return;
 }
 
 const staff = staffList.find(s => s.id === selectedStaffId);
 if (!staff) return;

 const days = getAttendanceDays(staff.username);
 const base = Number(baseSalary) || 0;
 const allow = Number(allowance) || 0;
 
 const total = Math.round((base / 26) * days + allow);

 const recordId = `PR_${staff.id}_${new Date().getMonth() + 1}_${new Date().getFullYear()}`;
 const newRecord = {
 id: recordId,
 staffId: staff.id,
 name: staff.name,
 role: staff.role,
 username: staff.username,
 baseSalary: base,
 allowance: allow,
 attendanceDays: days,
 totalReceived: total,
 timestamp: new Date().toISOString()
 };

 const updated = [...(payrollRecords || []).filter(r => r.id !== recordId), newRecord];
 
 fetch("/api/admin/payroll", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(newRecord)
 }).then(async res => {
 if (res.ok) {
 setPayrollRecords(updated);
 triggerToast("Đã lưu bảng lương thành công!");
 } else {
 const errData = await res.json().catch(() => ({}));
 triggerToast(errData.error ||"Lỗi lưu bảng lương!");
 }
 }).catch(err => {
 console.error(err);
 triggerToast("Lỗi lưu bảng lương!");
 });
 };

 const formatVND = (amount: number) => {
 return amount.toLocaleString("vi-VN") +" ₫";
 };

 return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative print-container">
 {/* Toast Notification */}
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

 {/* Header section */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => router.push("/admin")}
 className="p-2 rounded-xl bg-sidebar border border-white/0 text-gray-400 hover:text-white transition-all shadow-md no-print"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <BarChart3 className="text-gold" size={28} />
 Thống Kê & Nhân Sự
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Phân tích hiệu suất làm việc và quản lý bảng lương tự động
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex bg-sidebar border border-white/0 p-1 rounded-2xl shadow-inner no-print">
 <button
 onClick={() => setActiveTab("STATS")}
 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab ==="STATS" ?"bg-gold text-sidebar shadow-lg shadow-gold/20" :"text-gray-500 hover:text-white"}`}
 >
 Hiệu Suất KPI
 </button>
 {(user?.role ==="01" || user?.role ==="02" || user?.role ==="ADMIN" || user?.role ==="QUẢN LÝ CÔNG VIỆC") && (
 <button
 onClick={() => setActiveTab("PAYROLL")}
 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab ==="PAYROLL" ?"bg-gold text-sidebar shadow-lg shadow-gold/20" :"text-gray-500 hover:text-white"}`}
 >
 Bảng Lương
 </button>
 )}
 </div>
 
 {activeTab === "STATS" && (
  <>
    <button
      onClick={handleExportReport}
      className="h-10 px-6 rounded-xl bg-gold text-sidebar font-black uppercase text-sm tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-lg shadow-gold/5 no-print"
    >
      <Download size={14} /> Xuất CSV
    </button>
    <button
      onClick={handleExportExcel}
      className="h-10 ml-2 px-6 rounded-xl bg-blue-600 text-white font-black uppercase text-sm tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/5 no-print"
    >
      <Download size={14} /> Xuất Excel
    </button>
    <button
      onClick={() => window.print()}
      className="h-10 ml-2 px-6 rounded-xl bg-gray-700 text-white font-black uppercase text-sm tracking-widest hover:bg-gray-600 transition-all flex items-center gap-2 shadow-lg shadow-gray-500/5 no-print"
    >
      <Printer size={14} /> In PDF
    </button>
  </>
)}
 </div>
 </div>

 {activeTab ==="STATS" ? (
 <>
 {/* 4 Premium Stats Widgets */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-sidebar border border-white/0 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-white/0 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tỷ lệ hoàn thành KPI</span>
 <span className="text-3xl font-black text-white block">{stats.completionRate}%</span>
 <span className="text-[10px] text-green-400 font-bold block">▲ +4.2% so với tuần trước</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
 <TrendingUp size={28} />
 </div>
 </div>

 <div className="bg-sidebar border border-white/0 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Watch Hours lũy kế</span>
 <span className="text-3xl font-black text-indigo-400 block">450 / 2K<span className="text-sm text-gray-500"> Hrs</span></span>
 <span className="text-[10px] text-indigo-400/80 font-bold block">Quarter target progress: 22.5%</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
 <Clock size={28} />
 </div>
 </div>

 <div className="bg-sidebar border border-white/0 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tỷ lệ tài khoản LIVE</span>
 <span className="text-3xl font-black text-emerald-400 block">{stats.liveRatio}%</span>
 <span className="text-[10px] text-red-500 font-bold block">▼ {stats.dieMails} mail bị Die/Spam</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
 <UserCheck size={28} />
 </div>
 </div>

 <div className="bg-sidebar border border-white/0 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-sky-500/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tổng Sản Lượng Mail</span>
 <span className="text-3xl font-black text-sky-400 block">{stats.total} <span className="text-sm text-gray-500">Accounts</span></span>
 <span className="text-[10px] text-sky-400/80 font-bold block">{stats.roots} Gốc | {stats.satellites} Vệ tinh | {stats.monetized} BKT</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
 <Activity size={28} />
 </div>
 </div>
 </div>

 {/* Visual Analytics Graphs Row */}
 {(mails || []).length === 0 ? (
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-2xl flex items-center justify-center h-56 text-gray-500 font-bold uppercase tracking-widest">
 Chưa có dữ liệu
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-6">
 {/* SVG Cumulative Output Line Graph */}
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-2xl flex flex-col justify-between">
 <div className="flex items-center justify-between border-b border-white/0 pb-4 mb-4">
 <h3 className="text-md font-black text-white uppercase tracking-tighter flex items-center gap-2">
 <TrendingUp size={16} className="text-gold" />
 Sản lượng tích lũy tháng này (Tính theo Kênh đủ giờ)
 </h3>
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Đơn vị: Kênh</span>
 </div>

 <div className="flex-1 h-56 relative flex items-end">
    {/* SVG Interactive Line Chart representation */}
    <svg viewBox="0 0 500 200" className="w-full h-full">
      <defs>
        <linearGradient id="gradient-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Horizontal Grid lines */}
      <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeDasharray="5" />
      <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="5" />
      <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="5" />
      
      {/* Shaded Area */}
      {chartSvgData.areaPath && (
        <path d={chartSvgData.areaPath} fill="url(#gradient-sky)" />
      )}
      
      {/* Curved Line */}
      {chartSvgData.linePath && (
        <path d={chartSvgData.linePath} fill="none" stroke="#38bdf8" strokeWidth="3" />
      )}
      
      {/* Point Markers */}
      {(chartSvgData.points || []).map((pt, i) => (
        <circle 
          key={i} 
          cx={pt.x} 
          cy={pt.y} 
          r={i === chartSvgData.points.length - 1 ? 6 : 4} 
          fill={i === chartSvgData.points.length - 1 ? "#fbbf24" : "#38bdf8"} 
        >
          <title>Ngày {pt.day}: {pt.val} Kênh</title>
        </circle>
      ))}
    </svg>
  </div>

  <div className="flex justify-between text-[9px] text-gray-500 font-black uppercase tracking-widest mt-4 pt-3 border-t border-white/0 px-10">
    {xAxisLabels.map((day) => (
      <span key={day}>Ngày {day}</span>
    ))}
  </div>
 </div>
 </div>
 )}

 {/* Staff Productivity Report Leaderboard */}
 <div className="bg-sidebar border border-white/0 rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
 <div className="p-6 border-b border-white/0 bg-white/0 flex items-center justify-between">
 <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
 <Award size={18} className="text-gold animate-bounce" />
 Bảng hiệu suất nhân sự (KPI Leaderboard)
 </h3>
 <span className="text-[10px] font-black text-gold/80 bg-gold/10 px-3 py-1.5 rounded-xl border border-gold/20 uppercase tracking-widest">
 Hạng xuất sắc nhất: {staffLeaderboard[0]?.name ||"Chưa có"}
 </span>
 </div>
 <div className="flex-1 overflow-x-auto custom-scrollbar">
 <table className="w-full text-left text-base whitespace-nowrap min-w-[1000px]">
  <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0 sticky top-0 z-10">
  <tr>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center w-16">Hạng</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân sự</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tài khoản</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Chỉ tiêu</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Kênh đủ giờ (Tuần)</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Tổng tháng</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">KPI Tuần</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Xếp loại</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-white/5 text-gray-300">
  {(staffLeaderboard || []).length > 0 ? (
  (staffLeaderboard || []).map((staff, idx) => (
  <tr key={staff.username} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
  <td className="py-4.5 px-6 text-center">
  <span className={`h-6 w-6 rounded-lg font-black text-sm inline-flex items-center justify-center border ${
  staff.rank === 1 ?"bg-gold/20 border-white/5 text-gold" : 
  staff.rank === 2 ?"bg-gray-400/20 border-gray-400/30 text-gray-300" :
  staff.rank === 3 ?"bg-amber-700/20 border-amber-700/30 text-amber-500" :" border-white/0 text-gray-500"
  }`}>
  {staff.rank}
  </span>
  </td>
  <td className="py-4.5 px-6 font-black text-white text-sm">{staff.name}</td>
  <td className="py-4.5 px-6 text-sm text-gray-400 font-mono">{staff.username}</td>
  <td className="py-4.5 px-6 text-center font-bold text-gray-500">50 / ngày</td>
  <td className="py-4.5 px-6 text-center font-bold text-blue-500">{staff.weeklyChannels}</td>
  <td className="py-4.5 px-6 text-center font-bold text-purple-500">{staff.monthlyChannels}</td>
  <td className="py-4.5 px-6">
  <div className="flex items-center gap-3 w-40">
  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
  <div 
  className={`h-full rounded-full ${
  staff.kpiProgress >= 80 ?"bg-green-400" :
  staff.kpiProgress >= 50 ?"bg-gold" :"bg-red-400"
  }`}
  style={{ width: `${Math.min(100, staff.kpiProgress)}%` }}
  />
  </div>
  <span className="text-[10px] font-black text-white font-mono">{staff.kpiProgress}%</span>
  </div>
  </td>
  <td className="py-4.5 px-6 text-center">
  <span className={`h-6 px-3 rounded-lg font-black text-[10px] tracking-widest inline-flex items-center justify-center uppercase border ${
  staff.efficiency.includes("A") ?"bg-green-500/10 text-green-400 border-green-500/20" : 
  staff.efficiency.includes("B") ?"bg-gold/10 text-gold border-gold/20" :"bg-red-500/10 text-red-400 border-red-500/20"
  }`}>
  {staff.efficiency}
  </span>
  </td>
  </tr>
  ))
  ) : (
  <tr>
  <td colSpan={8} className="py-10 text-center font-bold uppercase tracking-widest">
  Chưa có dữ liệu
  </td>
  </tr>
  )}
  </tbody>
  </table>
 </div>
 </div>
 </>
 ) : (
 <div className="flex-1 flex flex-col gap-6">
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-2xl">
 <div className="flex items-center gap-2 border-b border-white/0 pb-4 mb-4">
 <Calculator size={18} className="text-gold" />
 <h3 className="text-lg font-black text-white uppercase tracking-tighter">Cấu hình Bảng lương</h3>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Chọn nhân viên</label>
 <select 
 className="h-12 px-4 rounded-xl bg-gray-800 text-white border border-gray-600 text-base focus:outline-none focus:border-white/5 cursor-pointer"
 value={selectedStaffId}
 onChange={(e) => setSelectedStaffId(e.target.value)}
 >
 <option value="" className="bg-sidebar text-gray-400">-- Nhấp để chọn --</option>
 {(staffList || []).map(s => (
 <option key={s.id} value={s.id} className="bg-sidebar">{s.name} (@{s.username})</option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Chức vụ (Tự động)</label>
 <input 
 type="text" 
 disabled 
 value={
 selectedStaffId 
 ? (staffList.find(s => s.id === selectedStaffId)?.role ==="01" ?"ADMIN" : 
 staffList.find(s => s.id === selectedStaffId)?.role ==="02" ?"QL CÔNG VIỆC" : 
 staffList.find(s => s.id === selectedStaffId)?.role ==="03" ?"QL NHÂN SỰ" :"NHÂN VIÊN")
 :""
 }
 className="h-12 px-4 rounded-xl bg-gray-800 text-white border border-gray-600 text-base font-bold" 
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Lương tháng cơ bản (VNĐ)</label>
 <input 
 type="text" 
 value={baseSalary ? Number(baseSalary).toLocaleString("vi-VN") :""}
 onChange={(e) => setBaseSalary(e.target.value.replace(/\D/g,""))}
 className="h-12 px-4 rounded-xl bg-gray-800 text-white border border-gray-600 text-base focus:outline-none focus:border-white/5 font-bold" 
 placeholder="Ví dụ: 5.000.000"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Trợ cấp (VNĐ)</label>
 <input 
 type="text" 
 value={allowance ? Number(allowance).toLocaleString("vi-VN") :""}
 onChange={(e) => setAllowance(e.target.value.replace(/\D/g,""))}
 className="h-12 px-4 rounded-xl bg-gray-800 text-white border border-gray-600 text-base focus:outline-none focus:border-white/5 font-bold" 
 placeholder="Ví dụ: 500.000"
 />
 </div>
 </div>
 
 <div className="mt-6 flex justify-end">
 <button 
 onClick={handleSavePayroll}
 className="h-12 px-8 rounded-xl bg-gold text-sidebar font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-xl shadow-gold/10"
 >
 <Save size={16} /> Lưu bảng lương
 </button>
 </div>
 </div>

 <div className="bg-sidebar border border-white/0 rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
 <div className="p-6 border-b border-white/0 bg-white/0 flex items-center gap-2">
 <Banknote size={18} className="text-green-400" />
 <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bảng Tổng Hợp Lương (Payroll Table)</h3>
 </div>
 <div className="flex-1 overflow-x-auto custom-scrollbar">
 <table className="w-full text-left text-base whitespace-nowrap min-w-[1000px]">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0 sticky top-0 z-10">
 <tr>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân viên</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Chức vụ</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Lương cơ bản</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Ngày công (Tích xanh)</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Trợ cấp</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Tổng nhận cuối tháng</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Thời gian lưu</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(payrollRecords || []).length > 0 ? (
 (payrollRecords || []).map((record) => (
 <tr key={record.id} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-4.5 px-6 font-black text-white text-sm">{record.name}</td>
 <td className="py-4.5 px-6 text-sm text-gray-400 font-bold">
 {record.role ==="01" ?"ADMIN" : record.role ==="02" ?"QL CÔNG VIỆC" : record.role ==="03" ?"QL NHÂN SỰ" :"NHÂN VIÊN"}
 </td>
 <td className="py-4.5 px-6 text-right font-mono text-gray-400">{formatVND(record.baseSalary)}</td>
 <td className="py-4.5 px-6 text-center">
 <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg font-black text-[10px]">
 <CalendarDays size={12} /> {record.attendanceDays} / 26
 </span>
 </td>
 <td className="py-4.5 px-6 text-right font-mono text-gray-400">{formatVND(record.allowance)}</td>
 <td className="py-4.5 px-6 text-right font-mono font-black text-gold text-base">{formatVND(record.totalReceived)}</td>
 <td className="py-4.5 px-6 text-right text-[10px] text-gray-500 font-bold">{new Date(record.timestamp).toLocaleString("vi-VN")}</td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={7} className="py-10 text-center font-bold uppercase tracking-widest">
 Chưa có dữ liệu
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
