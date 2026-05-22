"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface StaffPerformance {
  rank: number;
  name: string;
  username: string;
  assigned: number;
  completed: number;
  errorRate: number;
  kpiProgress: number;
  efficiency: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mails, setMails] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"STATS" | "PAYROLL">("STATS");

  // Payroll States
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [baseSalary, setBaseSalary] = useState("5000000");
  const [allowance, setAllowance] = useState("500000");
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);

  useEffect(() => {
    // Authenticate Roles
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const role = String(parsedUser.role || "").toUpperCase();
      if (role !== "01" && role !== "02" && role !== "ADMIN" && role !== "QUẢN LÝ CÔNG VIỆC" && role !== "QL CÔNG VIỆC") {
        router.push("/admin");
      }
    } else {
      router.push("/login");
    }

    const loadData = () => {
      const savedMails = localStorage.getItem("global_mails_data");
      const savedUsers = localStorage.getItem("global_users");
      
      setMails(savedMails ? JSON.parse(savedMails) : []);
      setStaffList(savedUsers ? JSON.parse(savedUsers) : []);
      
      const savedPayroll = localStorage.getItem("payroll_records");
      if (savedPayroll) {
        setPayrollRecords(JSON.parse(savedPayroll));
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

  const handleExportReport = () => {
    triggerToast("Đang kết xuất báo cáo thống kê chu kỳ... Đã xuất file AQ_MEDIA_REPORT.xlsx!");
    
    // Simulate File Download
    const element = document.createElement("a");
    const file = new Blob(["BÁO CÁO THỐNG KÊ AQ MEDIA\n\nTổng Số Lượng: " + mails.length + " tài khoản."], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "AQ_MEDIA_REPORT_SUMMARY.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 1. CALCULATE HIGH LEVEL STATS
  const stats = useMemo(() => {
    const total = mails.length || 300;
    const roots = mails.filter(m => m.type === "ROOT");
    const satellites = mails.filter(m => m.type === "SATELLITE");
    const monetized = mails.filter(m => m.type === "MONETIZED");

    const rootDone = roots.filter(m => m.verificationStatus === "Quét CCCD").length;
    const satelliteDone = satellites.filter(m => m.workStatus === "Đã làm").length;
    const monetizedDone = monetized.filter(m => m.workStatus === "Đã bán").length;

    const totalDone = rootDone + satelliteDone + monetizedDone;
    const completionRate = total > 0 ? ((totalDone / total) * 100).toFixed(1) : "0.0";
    
    const liveMails = mails.filter(m => m.status === "LIVE").length;
    const dieMails = mails.filter(m => m.status === "DIE").length;
    const liveRatio = total > 0 ? ((liveMails / total) * 100).toFixed(1) : "100.0";

    return {
      total,
      roots: roots.length,
      satellites: satellites.length,
      monetized: monetized.length,
      totalDone,
      completionRate,
      liveRatio,
      dieMails
    };
  }, [mails]);

  // 2. CALCULATE STAFF LEADERBOARDS
  const staffLeaderboard = useMemo<StaffPerformance[]>(() => {
    const list = staffList.filter((s: any) => s.role === "04" || s.role === "NHÂN VIÊN");
    
    const calculated = list.map((staff: any, idx: number) => {
      const myMails = mails.filter(m => String(m.assigneeId) === String(staff.id));
      // TODO: Đổi logic đếm KPI từ đếm số lượng Mail (myMails.length) sang đếm tổng số Kênh Đủ Giờ (eligibleChannels) khi kết nối API thật. Mục tiêu: 50 kênh/ngày.
      const completed = myMails.filter(m => m.workStatus === "Đã làm" || m.workStatus === "Đã bán").length;
      const failed = myMails.filter(m => m.workStatus === "Lỗi").length;
      
      const errorPercent = myMails.length > 0 ? Math.round((failed / myMails.length) * 100) : 0;
      const progress = myMails.length > 0 ? Math.round((completed / myMails.length) * 100) : 0;
      
      // Compute efficiency rating
      let efficiency = "C";
      if (progress >= 90) efficiency = "A+";
      else if (progress >= 75) efficiency = "A";
      else if (progress >= 50) efficiency = "B";

      return {
        rank: 0, // Placeholder
        name: staff.name,
        username: staff.username,
        assigned: myMails.length,
        completed: completed,
        errorRate: errorPercent,
        kpiProgress: progress,
        efficiency
      };
    });

    // Sort by KPI progress descending
    const sorted = [...calculated].sort((a, b) => b.kpiProgress - a.kpiProgress);
    return sorted.map((s, idx) => ({ ...s, rank: idx + 1, efficiency: idx === 0 ? "A+" : idx === 1 ? "A" : s.efficiency }));
  }, [staffList, mails]);

  // 3. PAYROLL LOGIC
  const getAttendanceDays = (username: string) => {
    let present = 0;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const checkinTime = localStorage.getItem(`checkin_time_${username}_${dateKey}`);
      
      if (checkinTime) {
        present++;
      }
    }
    return present;
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

    const updated = [...payrollRecords.filter(r => r.id !== recordId), newRecord];
    setPayrollRecords(updated);
    localStorage.setItem("payroll_records", JSON.stringify(updated));
    triggerToast("Đã lưu bảng lương thành công!");
  };

  const formatVND = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      {/* Toast Notification */}
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
              <BarChart3 className="text-gold" size={28} />
              Thống Kê & Nhân Sự (Reports & Payroll)
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
              Phân tích hiệu suất làm việc và quản lý bảng lương tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-sidebar border border-white/5 p-1 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab("STATS")}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "STATS" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "text-gray-500 hover:text-white"}`}
            >
              Hiệu Suất KPI
            </button>
            {(user?.role === "01" || user?.role === "02" || user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
              <button
                onClick={() => setActiveTab("PAYROLL")}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "PAYROLL" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "text-gray-500 hover:text-white"}`}
              >
                Bảng Lương
              </button>
            )}
          </div>
          
          {activeTab === "STATS" && (
            <button 
              onClick={handleExportReport}
              className="h-10 px-6 rounded-xl bg-gold text-sidebar font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-lg shadow-gold/5"
            >
              <Download size={14} /> Xuất Báo Cáo
            </button>
          )}
        </div>
      </div>

      {activeTab === "STATS" ? (
        <>
          {/* 4 Premium Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-gold/30 transition-all">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tỷ lệ hoàn thành KPI</span>
            <span className="text-3xl font-black text-white block">{stats.completionRate}%</span>
            <span className="text-[10px] text-green-400 font-bold block">▲ +4.2% so với tuần trước</span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <TrendingUp size={28} />
          </div>
        </div>

        <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Watch Hours lũy kế</span>
            <span className="text-3xl font-black text-indigo-400 block">450 / 2K<span className="text-xs text-gray-500"> Hrs</span></span>
            <span className="text-[10px] text-indigo-400/80 font-bold block">Quarter target progress: 22.5%</span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock size={28} />
          </div>
        </div>

        <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tỷ lệ tài khoản LIVE</span>
            <span className="text-3xl font-black text-emerald-400 block">{stats.liveRatio}%</span>
            <span className="text-[10px] text-red-500 font-bold block">▼ {stats.dieMails} mail bị Die/Spam</span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck size={28} />
          </div>
        </div>

        <div className="bg-sidebar border border-white/5 rounded-[24px] p-6 shadow-xl flex items-center justify-between group hover:border-sky-500/30 transition-all">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Tổng Sản Lượng Mail</span>
            <span className="text-3xl font-black text-sky-400 block">{stats.total} <span className="text-xs text-gray-500">Accounts</span></span>
            <span className="text-[10px] text-sky-400/80 font-bold block">{stats.roots} Gốc | {stats.satellites} Vệ tinh | {stats.monetized} BKT</span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Activity size={28} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Cumulative Output Line Graph */}
        <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h3 className="text-md font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <TrendingUp size={16} className="text-gold" />
              Sản lượng tích lũy tuần này
            </h3>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Đơn vị: tài khoản mail</span>
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
              <path d="M 0 170 Q 100 130 200 110 T 400 60 L 500 40 L 500 200 L 0 200 Z" fill="url(#gradient-sky)" />
              
              {/* Curved Line */}
              <path d="M 0 170 Q 100 130 200 110 T 400 60 L 500 40" fill="none" stroke="#38bdf8" strokeWidth="3" />
              
              {/* Point Markers */}
              <circle cx="100" cy="140" r="5" fill="#38bdf8" />
              <circle cx="200" cy="110" r="5" fill="#38bdf8" />
              <circle cx="300" cy="85" r="5" fill="#38bdf8" />
              <circle cx="400" cy="60" r="5" fill="#38bdf8" />
              <circle cx="500" cy="40" r="6" fill="#fbbf24" />
            </svg>
          </div>

          <div className="flex justify-between text-[9px] text-gray-500 font-black uppercase tracking-widest mt-4 pt-3 border-t border-white/5">
            <span>Thứ 2</span>
            <span>Thứ 3</span>
            <span>Thứ 4</span>
            <span>Thứ 5</span>
            <span>Thứ 6</span>
            <span>Hôm nay</span>
          </div>
        </div>

        {/* Circular Donut Type Distribution chart */}
        <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h3 className="text-md font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <Zap size={16} className="text-gold" />
              Phân bố loại mail quản lý
            </h3>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <svg className="w-36 h-36 transform -rotate-90">
              {/* Outer track */}
              <circle cx="72" cy="72" r="56" stroke="rgba(255,255,255,0.03)" strokeWidth="18" fill="transparent" />
              
              {/* Segments representing Gốc (ROOT), Vệ tinh (SATELLITE), BKT (MONETIZED) */}
              {/* Satellite Segment (50%) */}
              <circle cx="72" cy="72" r="56" stroke="#38bdf8" strokeWidth="18" fill="transparent" strokeDasharray="351.8" strokeDashoffset="175.9" />
              {/* Root Segment (33%) */}
              <circle cx="72" cy="72" r="56" stroke="#6366f1" strokeWidth="18" fill="transparent" strokeDasharray="351.8" strokeDashoffset="292.0" className="transform rotate-[180deg] origin-center" />
              {/* Monetized Segment (17%) */}
              <circle cx="72" cy="72" r="56" stroke="#10b981" strokeWidth="18" fill="transparent" strokeDasharray="351.8" strokeDashoffset="316.6" className="transform rotate-[298deg] origin-center" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tỉ lệ chính</span>
              <span className="text-xl font-black text-white">50% <span className="text-xs text-sky-400 font-medium">Sat</span></span>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-2 text-gray-400"><span className="h-2 w-2 rounded-full bg-sky-400" /> Mail Vệ Tinh (Satellite)</span>
              <span className="text-white">50.0%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-2 text-gray-400"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Mail Gốc (Root)</span>
              <span className="text-white">33.3%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-2 text-gray-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Mail BKT (Monetized)</span>
              <span className="text-white">16.7%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Productivity Report Leaderboard */}
      <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Award size={18} className="text-gold animate-bounce" />
            Bảng hiệu suất nhân sự (KPI Leaderboard)
          </h3>
          <span className="text-[10px] font-black text-gold/80 bg-gold/10 px-3 py-1.5 rounded-xl border border-gold/20 uppercase tracking-widest">
            Hạng xuất sắc nhất: {staffLeaderboard[0]?.name || "Chưa có"}
          </span>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5 sticky top-0 z-10">
              <tr>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center w-16">Hạng</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân sự</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tài khoản</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Tổng mail gán</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Hoàn thành</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Tỷ lệ lỗi</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">KPI Đạt được</th>
                <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Xếp loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {staffLeaderboard.length > 0 ? (
                staffLeaderboard.map((staff, idx) => (
                  <tr key={staff.username} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4.5 px-6 text-center">
                      <span className={`h-6 w-6 rounded-lg font-black text-xs inline-flex items-center justify-center border ${
                        staff.rank === 1 ? "bg-gold/20 border-gold/50 text-gold" : 
                        staff.rank === 2 ? "bg-gray-400/20 border-gray-400/30 text-gray-300" :
                        staff.rank === 3 ? "bg-amber-700/20 border-amber-700/30 text-amber-500" :
                        "border-white/5 text-gray-500"
                      }`}>
                        {staff.rank}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 font-black text-white text-xs">{staff.name}</td>
                    <td className="py-4.5 px-6 text-xs text-gray-400 font-mono">{staff.username}</td>
                    <td className="py-4.5 px-6 text-center font-bold">{staff.assigned} Mail</td>
                    <td className="py-4.5 px-6 text-center text-green-400 font-bold">{staff.completed} Mail</td>
                    <td className="py-4.5 px-6 text-center font-mono font-bold">
                      <span className={staff.errorRate > 0 ? "text-red-400" : "text-gray-500"}>
                        {staff.errorRate}%
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3 w-40">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              staff.kpiProgress >= 80 ? "bg-green-400" :
                              staff.kpiProgress >= 50 ? "bg-gold" : "bg-red-400"
                            }`}
                            style={{ width: `${staff.kpiProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-white font-mono">{staff.kpiProgress}%</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <span className={`h-6 px-3 rounded-lg font-black text-[10px] tracking-widest inline-flex items-center justify-center uppercase border ${
                        staff.efficiency.includes("A") ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        staff.efficiency.includes("B") ? "bg-gold/10 text-gold border-gold/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {staff.efficiency}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">
                    Chưa có số liệu nhân sự
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
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Calculator size={18} className="text-gold" />
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Cấu hình Bảng lương</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Chọn nhân viên</label>
                <select 
                  className="h-12 px-4 rounded-xl bg-black/20 border border-white/5 text-sm text-white focus:outline-none focus:border-gold/50 cursor-pointer"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                >
                  <option value="" className="bg-sidebar text-gray-400">-- Nhấp để chọn --</option>
                  {staffList.map(s => (
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
                      ? (staffList.find(s => s.id === selectedStaffId)?.role === "01" ? "ADMIN" : 
                         staffList.find(s => s.id === selectedStaffId)?.role === "02" ? "QL CÔNG VIỆC" : 
                         staffList.find(s => s.id === selectedStaffId)?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN")
                      : ""
                  }
                  className="h-12 px-4 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-400 font-bold" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Lương tháng cơ bản (VNĐ)</label>
                <input 
                  type="text" 
                  value={baseSalary ? Number(baseSalary).toLocaleString("vi-VN") : ""}
                  onChange={(e) => setBaseSalary(e.target.value.replace(/\D/g, ""))}
                  className="h-12 px-4 rounded-xl bg-black/20 border border-white/5 text-sm text-white focus:outline-none focus:border-gold/50 font-bold" 
                  placeholder="Ví dụ: 5.000.000"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Trợ cấp (VNĐ)</label>
                <input 
                  type="text" 
                  value={allowance ? Number(allowance).toLocaleString("vi-VN") : ""}
                  onChange={(e) => setAllowance(e.target.value.replace(/\D/g, ""))}
                  className="h-12 px-4 rounded-xl bg-black/20 border border-white/5 text-sm text-white focus:outline-none focus:border-gold/50 font-bold" 
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

          <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
              <Banknote size={18} className="text-green-400" />
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Bảng Tổng Hợp Lương (Payroll Table)</h3>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
                <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5 sticky top-0 z-10">
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
                  {payrollRecords.length > 0 ? (
                    payrollRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4.5 px-6 font-black text-white text-xs">{record.name}</td>
                        <td className="py-4.5 px-6 text-xs text-gray-400 font-bold">
                          {record.role === "01" ? "ADMIN" : record.role === "02" ? "QL CÔNG VIỆC" : record.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN"}
                        </td>
                        <td className="py-4.5 px-6 text-right font-mono text-gray-400">{formatVND(record.baseSalary)}</td>
                        <td className="py-4.5 px-6 text-center">
                          <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg font-black text-[10px]">
                            <CalendarDays size={12} /> {record.attendanceDays} / 26
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-right font-mono text-gray-400">{formatVND(record.allowance)}</td>
                        <td className="py-4.5 px-6 text-right font-mono font-black text-gold text-sm">{formatVND(record.totalReceived)}</td>
                        <td className="py-4.5 px-6 text-right text-[10px] text-gray-500 font-bold">{new Date(record.timestamp).toLocaleString("vi-VN")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">
                        Chưa có dữ liệu bảng lương
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
