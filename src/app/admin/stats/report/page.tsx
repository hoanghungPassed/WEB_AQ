"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
 Printer,
 Loader2,
 Filter,
 AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSWR } from "@/lib/useSWR";
import { LoadingOverlay } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";
import type { StaffData, MailData } from "@/types/admin";

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
 todayChannels: number;
}

export default function ReportsPage() {
 const router = useRouter();
 const [user, setUser] = useState<StaffData | null>(null);
 const [toastMsg, setToastMsg] = useState("");
 const [activeTab, setActiveTab] = useState<"STATS" | "PAYROLL">("STATS");

 // Filter states
 const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

 // Payroll States
 const [selectedStaffId, setSelectedStaffId] = useState("");
 const [baseSalary, setBaseSalary] = useState("5000000");
 const [allowance, setAllowance] = useState("500000");

 useEffect(() => {
  const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser) as StaffData;
    const role = String(parsedUser.role || "").toUpperCase();
    if (!["01", "02", "ADMIN", "QUẢN LÝ CÔNG VIỆC", "QL CÔNG VIỆC"].includes(role)) {
      router.push("/admin");
      return;
    }
    setUser(parsedUser);
  } else {
    router.push("/login");
  }
 }, [router]);

 const fetchKpiData = useCallback(async () => {
    const res = await fetch("/api/admin/kpis");
    if (!res.ok) throw new Error("Failed to fetch KPIs");
    return await res.json();
 }, []);

 const { data: kpiData, mutate, isValidating } = useSWR('kpi-report-data', fetchKpiData, { refreshInterval: 60000 });
 const isLoading = !kpiData && isValidating;

 const mails: MailData[] = useMemo(() => kpiData?.mails || [], [kpiData]);
 const staffList = useMemo(() => kpiData?.staff || [], [kpiData]);
 const payrollRecords = useMemo(() => kpiData?.payrollRecords || [], [kpiData]);

 const triggerToast = (msg: string) => {
 setToastMsg(msg);
 setTimeout(() => setToastMsg(""), 3000);
 };

 const handleExportReport = () => {
    triggerToast("Đang kết xuất báo cáo thống kê... Đã xuất file CSV!");
    
    const [year, month] = selectedMonth.split("-").map(Number);
    const displayMonth = month;
    const displayYear = year;

    // Get selected month's range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    let csvContent = "STT,Nhân viên,Username,Chỉ tiêu ngày,Kênh đủ giờ (Tháng),KPI Tháng (%),Xếp loại\n";
    
    const eligibleStaffList = (staffList || []).filter((s: StaffData) => s.role === "04" || s.role === "05");
    
    const calculatedStaff = (eligibleStaffList || []).map((staff: StaffData) => {
      const myMails = (mails || []).filter((m: MailData) => String(m.assigneeId) === String(staff.id));
      
      const eligibleChannelsMonthly = myMails.filter((m: MailData) => {
        if (m.type !== "SATELLITE" || !m.updatedAt) return false;
        const d = new Date(m.updatedAt);
        return d.getMonth() === month - 1 && d.getFullYear() === year;
      }).reduce((sum: number, m: MailData) => {
        return sum + ((Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0));
      }, 0);

      const targetMonthly = 26 * 50; // 26 days * 50 channels
      const progress = Math.round((eligibleChannelsMonthly / targetMonthly) * 100);
      
      let efficiency = "C";
      if (progress >= 100) efficiency = "A+";
      else if (progress >= 85) efficiency = "A";
      else if (progress >= 70) efficiency = "B";

      return {
        name: staff.name,
        username: staff.username,
        monthly: eligibleChannelsMonthly,
        progress,
        efficiency
      };
    }).sort((a: any, b: any) => b.monthly - a.monthly);

    calculatedStaff.forEach((staff: any, idx: number) => {
      csvContent += `${idx + 1},"${staff.name}","${staff.username}","50 / ngày",${staff.monthly},"${staff.progress}%","${staff.efficiency}"\n`;
    });

    const element = document.createElement("a");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {type: 'text/csv;charset=utf-8;'});
    element.href = URL.createObjectURL(blob);
    element.download = `AQ_MEDIA_REPORT_${displayMonth}_${displayYear}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`/api/admin/stats/export?month=${selectedMonth}`);
      if (!res.ok) {
        triggerToast('Xuất Excel thất bại');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AQ_MEDIA_REPORT_${selectedMonth}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      triggerToast('Đã xuất file Excel!');
    } catch (e) {
      console.error(e);
      triggerToast('Lỗi khi xuất Excel');
    }
  };

 // 1. CALCULATE HIGH LEVEL STATS (Filtered by Selected Month)
 const stats = useMemo(() => {
   const [year, month] = selectedMonth.split("-").map(Number);
   
   const monthlyMails = (mails || []).filter((m: MailData) => {
     if (!m.updatedAt) return false;
     const d = new Date(m.updatedAt);
     return d.getMonth() === month - 1 && d.getFullYear() === year;
   });

   const total = monthlyMails.length;
   const roots = monthlyMails.filter((m: MailData) => m.type === "ROOT");
   const satellites = monthlyMails.filter((m: MailData) => m.type === "SATELLITE");
   const monetized = monthlyMails.filter((m: MailData) => m.type === "MONETIZED");

   const rootDone = roots.filter((m: MailData) => m.verificationStatus === "Quét CCCD").length;
   const satelliteDone = satellites.filter((m: MailData) => m.workStatus === "Đã làm").length;
   const monetizedDone = monetized.filter((m: MailData) => m.workStatus === "Đã bán").length;

   const totalDone = rootDone + satelliteDone + monetizedDone;
   const completionRate = total > 0 ? ((totalDone / total) * 100).toFixed(1) : "0.0";
   
   const liveMails = monthlyMails.filter((m: MailData) => m.status === "LIVE").length;
   const dieMails = monthlyMails.filter((m: MailData) => m.status === "DIE").length;
   const liveRatio = total > 0 ? ((liveMails / total) * 100).toFixed(1) : "0.0";

   const totalEligibleChannels = satellites.reduce((sum: number, m: MailData) => {
     const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
     return sum + count;
   }, 0);

   return {
     total,
     roots: roots.length,
     satellites: satellites.length,
     monetized: monetized.length,
     totalDone,
     completionRate,
     liveRatio,
     dieMails,
     totalEligibleChannels
   };
 }, [mails, selectedMonth]);

  // 1.5. CALCULATE CUMULATIVE OUTPUT DATA FOR SELECTED MONTH
  const monthlyCumulativeData = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Initialize daily eligible channels counts
    const dailyCounts = Array(daysInMonth).fill(0);
    
    (mails || []).forEach(m => {
      if (m.type === "SATELLITE" && m.updatedAt) {
        const date = new Date(m.updatedAt);
        if (date.getMonth() === month - 1 && date.getFullYear() === year) {
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
  }, [mails, selectedMonth]);

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

 // 2. CALCULATE STAFF LEADERBOARDS
 const staffLeaderboard = useMemo<StaffPerformance[]>(() => {
   const list = (staffList || []).filter((s: any) => ["04", "05", "NHÂN VIÊN", "NV THỬ VIỆC"].includes(s.role));
   
   const [year, month] = selectedMonth.split("-").map(Number);
   
   // Today range (VN time)
   const now = new Date();
   const utc = now.getTime() + now.getTimezoneOffset() * 60000;
   const vnNow = new Date(utc + 3600000 * 7);
   const todayStart = new Date(vnNow);
   todayStart.setHours(0, 0, 0, 0);

   // Current week's Monday
   const dayOfWeek = vnNow.getDay();
   const diff = vnNow.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
   const monday = new Date(vnNow.setDate(diff));
   monday.setHours(0, 0, 0, 0);

   const calculated = list.map((staff: any) => {
     const myMails = (mails || []).filter((m: MailData) => String(m.assigneeId) === String(staff.id));
     
     const monthlyMails = myMails.filter((m: MailData) => {
       if (!m.updatedAt) return false;
       const d = new Date(m.updatedAt);
       return d.getMonth() === month - 1 && d.getFullYear() === year;
     });

     const weeklyMails = myMails.filter((m: MailData) => {
       if (!m.updatedAt) return false;
       return new Date(m.updatedAt) >= monday;
     });

     const todayMails = myMails.filter((m: MailData) => {
       if (!m.updatedAt) return false;
       return new Date(m.updatedAt) >= todayStart;
     });

     const eligibleChannelsMonthly = monthlyMails.filter((m: MailData) => m.type === "SATELLITE").reduce((sum: number, m: MailData) => {
       const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
       return sum + count;
     }, 0);

     const eligibleChannelsWeekly = weeklyMails.filter((m: MailData) => m.type === "SATELLITE").reduce((sum: number, m: MailData) => {
       const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
       return sum + count;
     }, 0);

     const eligibleChannelsToday = todayMails.filter((m: MailData) => m.type === "SATELLITE").reduce((sum: number, m: MailData) => {
       const count = (Array.isArray(m.links) ? m.links.filter((l: string) => typeof l === 'string' && l.trim() !== "").length : 0) || (Array.isArray(m.eligibleChannels) ? m.eligibleChannels.filter(Boolean).length : 0);
       return sum + count;
     }, 0);

     const targetWeekly = 300; 
     const progress = targetWeekly > 0 ? Math.round((eligibleChannelsWeekly / targetWeekly) * 100) : 0;
     
     const completed = monthlyMails.filter((m: MailData) => m.workStatus === "Đã làm" || m.workStatus === "Đã bán" || m.verificationStatus === "Quét CCCD").length;
     const failed = monthlyMails.filter((m: MailData) => m.workStatus === "Lỗi").length;
     
     const errorPercent = monthlyMails.length > 0 ? Math.round((failed / monthlyMails.length) * 100) : 0;
     
     let efficiency = "C";
     if (progress >= 100) efficiency = "A+";
     else if (progress >= 85) efficiency = "A";
     else if (progress >= 70) efficiency = "B";

     return {
       rank: 0,
       name: staff.name,
       username: staff.username,
       assigned: monthlyMails.length,
       completed: completed,
       errorRate: errorPercent,
       kpiProgress: progress,
       efficiency,
       weeklyChannels: eligibleChannelsWeekly,
       monthlyChannels: eligibleChannelsMonthly,
       todayChannels: eligibleChannelsToday
     };
   });

   const sorted = [...calculated].sort((a, b) => b.monthlyChannels - a.monthlyChannels);
   return sorted.map((s, idx) => ({ ...s, rank: idx + 1 }));
 }, [staffList, mails, selectedMonth]);

 const handleSavePayroll = () => {
   if (!selectedStaffId) {
     triggerToast("Vui lòng chọn nhân viên!");
     return;
   }
   
   const staff = staffList.find(s => s.id === selectedStaffId);
   if (!staff) return;

   const days = 26; // Default or fetch from attendance if possible
   const base = Number(baseSalary) || 0;
   const allow = Number(allowance) || 0;
   
   const total = Math.round((base / 26) * days + allow);

   const newRecord = {
     staffId: staff.id,
     name: staff.name,
     role: staff.role,
     username: staff.username,
     month: selectedMonth,
     baseSalary: base,
     allowance: allow,
     attendanceDays: days,
     totalReceived: total,
     netPay: total,
     timestamp: new Date().toISOString()
   };

   fetch("/api/admin/payroll", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(newRecord)
   }).then(async res => {
     if (res.ok) {
       mutate(); // Refresh data
       triggerToast("Đã lưu bảng lương thành công!");
     } else {
       const errData = await res.json().catch(() => ({}));
       triggerToast(errData.error || "Lỗi lưu bảng lương!");
     }
   }).catch(err => {
     console.error(err);
     triggerToast("Lỗi lưu bảng lương!");
   });
 };

 const formatVND = (amount: number) => {
   return amount.toLocaleString("vi-VN") + " ₫";
 };

 return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative print-container">
 {isLoading && <LoadingOverlay />}
 
 {/* Toast Notification */}
 <AnimatePresence>
 {toastMsg && (
 <motion.div 
 initial={{ opacity: 0, y: -20, x: "-50%" }} 
 animate={{ opacity: 1, y: 30, x: "-50%" }} 
 exit={{ opacity: 0, y: -20, x: "-50%" }}
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
 <div className="flex items-center gap-4 mt-1">
   <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
     Phân tích hiệu suất thực tế & Quản lý bảng lương
   </p>
   <div className="flex items-center gap-2 bg-sidebar border border-white/5 px-3 py-1 rounded-lg no-print">
     <CalendarDays size={14} className="text-gold" />
     <input 
       type="month" 
       value={selectedMonth}
       onChange={(e) => setSelectedMonth(e.target.value)}
       className="bg-transparent text-white text-xs font-black uppercase outline-none cursor-pointer"
     />
   </div>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex bg-sidebar border border-white/5 p-1 rounded-2xl shadow-inner no-print">
 <button
 onClick={() => setActiveTab("STATS")}
 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "STATS" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "text-gray-500 hover:text-white"}`}
 >
 Hiệu Suất KPI
 </button>
 {(user?.role === "01" || user?.role === "02") && (
 <button
 onClick={() => setActiveTab("PAYROLL")}
 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "PAYROLL" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "text-gray-500 hover:text-white"}`}
 >
 Bảng Lương
 </button>
 )}
 </div>
 
 {activeTab === "STATS" && (
  <>
    <button
      onClick={handleExportReport}
      className="h-10 px-6 rounded-xl bg-sidebar border border-white/5 text-gray-300 font-black uppercase text-sm tracking-widest hover:text-gold transition-all flex items-center gap-2 shadow-lg no-print"
    >
      <Download size={14} /> CSV
    </button>
    <button
      onClick={handleExportExcel}
      className="h-10 ml-2 px-6 rounded-xl bg-gold text-sidebar font-black uppercase text-sm tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-lg shadow-gold/5 no-print"
    >
      <Download size={14} /> Excel
    </button>
    <button
      onClick={() => window.print()}
      className="h-10 ml-2 px-6 rounded-xl bg-gray-700 text-white font-black uppercase text-sm tracking-widest hover:bg-gray-600 transition-all flex items-center gap-2 shadow-lg shadow-gray-500/5 no-print"
    >
      <Printer size={14} /> In
    </button>
  </>
)}
 </div>
 </div>

 {activeTab === "STATS" ? (
 <>
 {/* Real Stats Widgets */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-gold/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tỷ lệ hoàn thành Mail</span>
 <span className="text-3xl font-black text-white block">{stats.completionRate}%</span>
 <span className="text-[10px] text-gray-400 font-bold block">Tổng: {stats.totalDone} / {stats.total} account</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
 <TrendingUp size={28} />
 </div>
 </div>

 <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Sản lượng Kênh đủ giờ</span>
 <span className="text-3xl font-black text-blue-400 block">{stats.totalEligibleChannels} <span className="text-sm text-gray-500">Kênh</span></span>
 <span className="text-[10px] text-blue-400/80 font-bold block">Tích lũy trong tháng {selectedMonth}</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
 <Zap size={28} />
 </div>
 </div>

 <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Chất lượng tài khoản (LIVE)</span>
 <span className="text-3xl font-black text-emerald-400 block">{stats.liveRatio}%</span>
 <span className="text-[10px] text-red-500 font-bold block">{stats.dieMails} tài khoản DIE / SPAM</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
 <UserCheck size={28} />
 </div>
 </div>

 <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-sky-500/30 transition-all">
 <div className="space-y-1">
 <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Phân loại tài khoản</span>
 <div className="flex items-baseline gap-2">
   <span className="text-2xl font-black text-white">{stats.total}</span>
   <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Accounts</span>
 </div>
 <span className="text-[10px] text-sky-400/80 font-bold block">{stats.roots} Gốc | {stats.satellites} Vệ tinh | {stats.monetized} BKT</span>
 </div>
 <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
 <Activity size={28} />
 </div>
 </div>
 </div>

 {/* Visual Analytics Graphs Row */}
 {stats.total === 0 ? (
 <div className="bg-sidebar border border-white/5 rounded-[32px] p-6 shadow-2xl flex flex-col items-center justify-center h-64 text-gray-500 font-bold uppercase tracking-widest gap-4">
 <Activity size={48} className="opacity-20" />
 Chưa có dữ liệu trong tháng {selectedMonth}
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-6">
 <div className="bg-sidebar border border-white/5 rounded-[32px] p-6 shadow-2xl flex flex-col justify-between">
 <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
 <h3 className="text-md font-black text-white uppercase tracking-tighter flex items-center gap-2">
 <TrendingUp size={16} className="text-gold" />
 Biểu đồ sản lượng tích lũy (Kênh đủ giờ)
 </h3>
 <div className="flex items-center gap-4">
   <div className="flex items-center gap-2">
     <div className="w-3 h-3 rounded-full bg-blue-400" />
     <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Sản lượng lũy kế</span>
   </div>
   <span className="text-[9px] font-black text-gray-400 bg-white/5 px-2 py-1 rounded">Tháng {selectedMonth}</span>
 </div>
 </div>

 <div className="flex-1 h-56 relative flex items-end">
    <svg viewBox="0 0 500 200" className="w-full h-full">
      <defs>
        <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeDasharray="5" />
      <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="5" />
      <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="5" />
      
      {chartSvgData.areaPath && (
        <path d={chartSvgData.areaPath} fill="url(#gradient-blue)" />
      )}
      
      {chartSvgData.linePath && (
        <path d={chartSvgData.linePath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      )}
      
      {(chartSvgData.points || []).map((pt, i) => (
        <circle 
          key={i} 
          cx={pt.x} 
          cy={pt.y} 
          r={i === chartSvgData.points.length - 1 ? 5 : 3} 
          fill={i === chartSvgData.points.length - 1 ? "#fbbf24" : "#38bdf8"} 
          className="transition-all hover:r-6 cursor-help"
        >
          <title>Ngày {pt.day}: {pt.val} Kênh</title>
        </circle>
      ))}
    </svg>
  </div>

  <div className="flex justify-between text-[9px] text-gray-500 font-black uppercase tracking-widest mt-4 pt-3 border-t border-white/5 px-10">
    {xAxisLabels.map((day) => (
      <span key={day}>Ngày {day}</span>
    ))}
  </div>
 </div>
 </div>
 )}

 {/* Staff Productivity Report Leaderboard */}
 <div className="bg-sidebar border border-white/5 rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
 <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
 <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
 <Award size={18} className="text-gold animate-bounce" />
 Bảng xếp hạng hiệu suất nhân sự
 </h3>
 <div className="flex items-center gap-4">
   <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
     <CheckCircle2 size={12} className="text-green-400" />
     <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
       Hạng 1: {staffLeaderboard[0]?.name || "N/A"}
     </span>
   </div>
 </div>
 </div>
 <div className="flex-1 overflow-x-auto custom-scrollbar">
 <table className="w-full text-left text-base whitespace-nowrap min-w-[1000px]">
  <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5 sticky top-0 z-10">
  <tr>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center w-16">Hạng</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân sự</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Hôm nay</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Tuần này</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Tháng này (Kênh)</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Tài khoản (Tháng)</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tiến độ KPI Tuần</th>
  <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Xếp loại</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-white/5 text-gray-300">
  {(staffLeaderboard || []).length > 0 ? (
  (staffLeaderboard || []).map((staff, idx) => (
  <tr key={staff.username} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
  <td className="py-4.5 px-6 text-center">
  <span className={`h-6 w-6 rounded-lg font-black text-sm inline-flex items-center justify-center border ${
  staff.rank === 1 ? "bg-gold/20 border-gold/30 text-gold" : 
  staff.rank === 2 ? "bg-gray-400/20 border-gray-400/30 text-gray-300" :
  staff.rank === 3 ? "bg-amber-700/20 border-amber-700/30 text-amber-500" : " border-white/5 text-gray-600"
  }`}>
  {staff.rank}
  </span>
  </td>
  <td className="py-4.5 px-6">
    <div className="flex flex-col">
      <span className="font-black text-white text-sm">{staff.name}</span>
      <span className="text-[10px] text-gray-500 font-mono tracking-tight">@{staff.username}</span>
    </div>
  </td>
  <td className="py-4.5 px-6 text-center font-bold text-emerald-400">+{staff.todayChannels}</td>
  <td className="py-4.5 px-6 text-center font-bold text-blue-400">{staff.weeklyChannels}</td>
  <td className="py-4.5 px-6 text-center font-bold text-purple-400">{staff.monthlyChannels}</td>
  <td className="py-4.5 px-6 text-center font-bold text-gray-400">{staff.assigned}</td>
  <td className="py-4.5 px-6">
  <div className="flex items-center gap-3 w-40">
  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
  <div 
  className={`h-full rounded-full transition-all duration-500 ${
  staff.kpiProgress >= 100 ? "bg-emerald-400" :
  staff.kpiProgress >= 70 ? "bg-gold" : "bg-red-400"
  }`}
  style={{ width: `${Math.min(100, staff.kpiProgress)}%` }}
  />
  </div>
  <span className="text-[10px] font-black text-white font-mono">{staff.kpiProgress}%</span>
  </div>
  </td>
  <td className="py-4.5 px-6 text-center">
  <span className={`h-6 px-3 rounded-lg font-black text-[10px] tracking-widest inline-flex items-center justify-center uppercase border ${
  staff.efficiency.includes("A") ? "bg-green-500/10 text-green-400 border-green-500/20" : 
  staff.efficiency.includes("B") ? "bg-gold/10 text-gold border-gold/20" : "bg-red-500/10 text-red-400 border-red-500/20"
  }`}>
  {staff.efficiency}
  </span>
  </td>
  </tr>
  ))
  ) : (
  <tr>
  <td colSpan={8} className="py-10 text-center font-bold uppercase tracking-widest text-gray-500">
  Không tìm thấy nhân sự phù hợp
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
 <div className="bg-sidebar border border-white/5 rounded-[32px] p-6 shadow-2xl">
 <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
   <div className="flex items-center gap-2">
     <Calculator size={18} className="text-gold" />
     <h3 className="text-lg font-black text-white uppercase tracking-tighter">Cấu hình Bảng lương Tháng {selectedMonth}</h3>
   </div>
   <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/10 px-4 py-2 rounded-xl">
     <AlertCircle size={14} className="text-gold" />
     <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Dữ liệu được tính toán dựa trên cấu hình & KPI thực tế</span>
   </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Chọn nhân viên</label>
 <select 
 className="h-12 px-4 rounded-xl bg-[#0a0a0a] text-white border border-white/5 text-base focus:outline-none focus:border-gold/50 cursor-pointer transition-all"
 value={selectedStaffId}
 onChange={(e) => {
   const id = e.target.value;
   setSelectedStaffId(id);
   const staff = staffList.find(s => s.id === id);
   if (staff) {
     setBaseSalary(String(staff.baseSalary || 5000000));
     setAllowance(String(staff.allowance || 500000));
   }
 }}
 >
 <option value="" className="bg-zinc-900 text-white">-- Nhấp để chọn --</option>
 {(staffList || []).map(s => (
 <option key={s.id} value={s.id} className="bg-zinc-900 text-white">{s.name} (@{s.username})</option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Chức vụ</label>
 <div className="h-12 px-4 rounded-xl bg-white/5 text-gray-400 border border-white/5 flex items-center font-bold text-sm uppercase tracking-widest">
   {selectedStaffId 
     ? (staffList.find(s => s.id === selectedStaffId)?.role === "01" ? "ADMIN" : 
        staffList.find(s => s.id === selectedStaffId)?.role === "02" ? "QL CÔNG VIỆC" : 
        staffList.find(s => s.id === selectedStaffId)?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN")
     : "Chưa chọn"}
 </div>
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Lương cơ bản (VNĐ)</label>
 <input 
 type="text" 
 value={baseSalary ? Number(baseSalary).toLocaleString("vi-VN") : ""}
 onChange={(e) => setBaseSalary(e.target.value.replace(/\D/g, ""))}
 className="h-12 px-4 rounded-xl bg-[#0a0a0a] text-white border border-white/5 text-base focus:outline-none focus:border-gold/50 font-bold" 
 placeholder="Ví dụ: 5.000.000"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Trợ cấp (VNĐ)</label>
 <input 
 type="text" 
 value={allowance ? Number(allowance).toLocaleString("vi-VN") : ""}
 onChange={(e) => setAllowance(e.target.value.replace(/\D/g, ""))}
 className="h-12 px-4 rounded-xl bg-[#0a0a0a] text-white border border-white/5 text-base focus:outline-none focus:border-gold/50 font-bold" 
 placeholder="Ví dụ: 500.000"
 />
 </div>
 </div>
 
 <div className="mt-6 flex justify-between items-center bg-white/5 p-4 rounded-[20px] border border-white/5">
   <div className="flex items-center gap-6">
     <div className="flex flex-col">
       <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Dự kiến nhận (26 ngày công)</span>
       <span className="text-xl font-black text-gold">{formatVND(Number(baseSalary) + Number(allowance))}</span>
     </div>
     <div className="w-[1px] h-10 bg-white/10" />
     <div className="flex flex-col">
       <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Hiệu suất KPI Tháng</span>
       <span className="text-xl font-black text-blue-400">
         {staffLeaderboard.find(s => s.username === staffList.find(u => u.id === selectedStaffId)?.username)?.monthlyChannels || 0} Kênh
       </span>
     </div>
   </div>
   <button 
     onClick={handleSavePayroll}
     disabled={!selectedStaffId}
     className={`h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-xl ${
       selectedStaffId 
       ? "bg-gold text-sidebar hover:bg-yellow-500 shadow-gold/10" 
       : "bg-gray-800 text-gray-500 cursor-not-allowed"
     }`}
   >
     <Save size={16} /> Chốt bảng lương
   </button>
 </div>
 </div>

 <div className="bg-sidebar border border-white/5 rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
 <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
   <div className="flex items-center gap-2">
     <Banknote size={18} className="text-green-400" />
     <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bảng Tổng Hợp Lương (Đã chốt)</h3>
   </div>
   <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
     Tháng {selectedMonth}
   </div>
 </div>
 <div className="flex-1 overflow-x-auto custom-scrollbar">
 <table className="w-full text-left text-base whitespace-nowrap min-w-[1000px]">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5 sticky top-0 z-10">
 <tr>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân viên</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Chức vụ</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Lương cơ bản</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Ngày công</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Trợ cấp</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Tổng thực nhận</th>
 <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-right">Ngày lưu</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {payrollRecords.filter((r: any) => r.month === selectedMonth).length > 0 ? (
 payrollRecords.filter((r: any) => r.month === selectedMonth).map((record: any) => (
 <tr key={record.id || record._id} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-4.5 px-6">
    <div className="flex flex-col">
      <span className="font-black text-white text-sm">{record.name}</span>
      <span className="text-[10px] text-gray-500 font-mono tracking-tight">@{record.username}</span>
    </div>
 </td>
 <td className="py-4.5 px-6 text-[10px] text-gray-400 font-black uppercase tracking-widest">
 {record.role === "01" ? "ADMIN" : record.role === "02" ? "QL CÔNG VIỆC" : record.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN"}
 </td>
 <td className="py-4.5 px-6 text-right font-mono text-gray-400">{formatVND(record.baseSalary)}</td>
 <td className="py-4.5 px-6 text-center">
 <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg font-black text-[10px]">
 <CalendarDays size={12} /> {record.attendanceDays} / 26
 </span>
 </td>
 <td className="py-4.5 px-6 text-right font-mono text-gray-400">{formatVND(record.allowance)}</td>
 <td className="py-4.5 px-6 text-right font-mono font-black text-gold text-base">{formatVND(record.totalReceived || record.netPay)}</td>
 <td className="py-4.5 px-6 text-right text-[10px] text-gray-500 font-bold">{new Date(record.timestamp || record.createdAt).toLocaleString("vi-VN")}</td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={7} className="py-10 text-center font-bold uppercase tracking-widest text-gray-500">
 Chưa có dữ liệu bảng lương đã chốt trong tháng này
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
