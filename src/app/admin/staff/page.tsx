"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  UserX, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  ClipboardList, 
  Key, 
  Lock, 
  Unlock,
  X,
  Mail,
  Shield,
  Zap,
  Activity,
  ChevronRight,
  Clock
} from "lucide-react";
import { MOCK_STAFF } from "@/data/mockData";
import { StaffData } from "@/types/admin";

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffData[]>(MOCK_STAFF);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
  const itemsPerPage = 10;

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: staffList.length,
      online: staffList.filter(s => s.isOnline).length,
      offline: staffList.filter(s => !s.isOnline).length,
      locked: staffList.filter(s => s.status === "LOCKED").length,
    };
  }, [staffList]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, roleFilter, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const currentStaff = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStaff, currentPage]);

  const handleToggleStatus = (id: string) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === id) {
        const newStatus = s.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
        const updated = { ...s, status: newStatus as "ACTIVE" | "LOCKED" };
        if (selectedStaff?.id === id) setSelectedStaff(updated);
        return updated;
      }
      return s;
    }));
  };

  const handleUpdateRole = (id: string, newRole: "ADMIN" | "LEADER" | "STAFF") => {
    setStaffList(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, role: newRole };
        if (selectedStaff?.id === id) setSelectedStaff(updated);
        return updated;
      }
      return s;
    }));
  };

  return (
    <div className="space-y-8 pb-10 relative">
      {/* Header & Stats */}
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Quản lý nhân viên</h1>
            <p className="text-gray-500 font-medium mt-1">Quản lý đội ngũ, phân quyền và theo dõi hiệu suất.</p>
          </div>
          <button className="h-12 px-6 bg-gold hover:bg-gold/80 text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gold/20">
            <Plus size={18} strokeWidth={3} /> Thêm nhân viên
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Tổng nhân viên" value={stats.total} icon={<Users size={28} />} color="blue" />
          <StatCard title="Đang Online" value={stats.online} icon={<UserCheck size={28} />} color="green" />
          <StatCard title="Offline" value={stats.offline} icon={<UserMinus size={28} />} color="gray" />
          <StatCard title="Bị khóa" value={stats.locked} icon={<UserX size={28} />} color="red" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm tên hoặc username..." 
              className="w-full h-12 bg-black/20 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-2xl px-4 h-12">
              <Shield size={16} className="text-gold" />
              <select 
                className="bg-transparent border-none outline-none text-xs text-white font-bold uppercase tracking-widest cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL" className="bg-sidebar">Tất cả Role</option>
                <option value="01" className="bg-sidebar">01 - ADMIN</option>
                <option value="02" className="bg-sidebar">02 - QL CÔNG VIỆC</option>
                <option value="03" className="bg-sidebar">03 - QL NHÂN SỰ</option>
                <option value="04" className="bg-sidebar">04 - NHÂN VIÊN</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-2xl px-4 h-12">
              <Activity size={16} className="text-gold" />
              <select 
                className="bg-transparent border-none outline-none text-xs text-white font-bold uppercase tracking-widest cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL" className="bg-sidebar">Tất cả Trạng thái</option>
                <option value="ACTIVE" className="bg-sidebar">Đang hoạt động</option>
                <option value="LOCKED" className="bg-sidebar">Đã khóa</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-sidebar border border-border-custom rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 uppercase text-[11px] font-black tracking-widest text-gray-500">
                <th className="px-10 py-8">Nhân viên</th>
                <th className="px-8 py-8">Username</th>
                <th className="px-8 py-8">Role</th>
                <th className="px-8 py-8">Trạng thái</th>
                <th className="px-8 py-8">Số Task</th>
                <th className="px-8 py-8">KPI</th>
                <th className="px-10 py-8 text-center">Online</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentStaff.map((staff) => (
                <tr key={staff.id} className="group hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => setSelectedStaff(staff)}>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-2xl text-gold font-black border border-gold/10 shadow-xl group-hover:scale-110 transition-all">
                        {staff.name.charAt(0)}
                      </div>
                      <div className="whitespace-nowrap">
                        <p className="text-lg font-black text-white group-hover:text-gold transition-colors">{staff.name}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1 tracking-wider">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <span className="text-sm font-mono text-gray-400">@{staff.username}</span>
                  </td>
                  <td className="px-8 py-7">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border whitespace-nowrap ${
                      staff.role === "01" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      staff.role === "02" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                      staff.role === "03" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    }`}>
                      {staff.role === "01" ? "01 - ADMIN" : 
                       staff.role === "02" ? "02 - QL CÔNG VIỆC" : 
                       staff.role === "03" ? "03 - QL NHÂN SỰ" : "04 - NHÂN VIÊN"}
                    </span>
                  </td>
                  <td className="px-8 py-7">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border whitespace-nowrap ${
                      staff.status === "ACTIVE" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}>
                      {staff.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="px-8 py-7">
                    <span className="text-lg font-black text-white">{staff.taskCount}</span>
                  </td>
                  <td className="px-8 py-7 w-48">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden min-w-[80px]">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${staff.kpiProgress}%` }} 
                          className={`h-full rounded-full ${staff.kpiProgress > 80 ? "bg-green-500" : staff.kpiProgress > 50 ? "bg-gold" : "bg-red-500"}`}
                        />
                      </div>
                      <span className="text-xs font-black text-gray-400">{staff.kpiProgress}%</span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-center">
                    <div className={`h-3.5 w-3.5 rounded-full mx-auto shadow-lg border-2 border-sidebar ${staff.isOnline ? "bg-green-500 shadow-green-500/40" : "bg-red-500 shadow-red-500/40"}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-white/[0.02] border-t border-white/5 px-10 py-6 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Hiển thị <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredStaff.length)}</span> trên <span className="text-white">{filteredStaff.length}</span> nhân sự
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-10 px-4 rounded-xl border border-white/5 bg-white/5 text-gray-500 hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-gray-500 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              Trước
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-10 w-10 rounded-xl border transition-all text-[10px] font-black ${
                    currentPage === i + 1 
                      ? "bg-gold border-gold text-sidebar shadow-lg shadow-gold/20" 
                      : "bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-10 px-4 rounded-xl border border-white/5 bg-white/5 text-gray-500 hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-gray-500 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Staff Detail Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedStaff(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-sidebar border border-white/5 rounded-[48px] shadow-2xl overflow-hidden p-10 flex flex-col md:flex-row gap-10"
            >
              <div className="flex flex-col items-center text-center md:w-1/3">
                <div className="h-32 w-32 rounded-[40px] bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center text-5xl font-black text-sidebar shadow-2xl shadow-gold/20 mb-6">
                  {selectedStaff.name.charAt(0)}
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter leading-tight">{selectedStaff.name}</h2>
                <p className="text-sm font-bold text-gold uppercase tracking-widest mt-2">@{selectedStaff.username}</p>
                
                <div className="mt-8 w-full space-y-3">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">KPI Hệ Thống</p>
                    <p className="text-3xl font-black text-white">{selectedStaff.kpiProgress}%</p>
                  </div>
                  <button className="w-full h-12 rounded-2xl bg-gold/10 hover:bg-gold/20 text-gold font-bold text-xs uppercase tracking-widest transition-all border border-gold/20 flex items-center justify-center gap-2">
                    <Key size={14} /> Reset Password
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(selectedStaff.id)}
                    className={`w-full h-12 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                    selectedStaff.status === "ACTIVE" ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white" : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white"
                  }`}>
                    {selectedStaff.status === "ACTIVE" ? <Lock size={14} /> : <Unlock size={14} />}
                    {selectedStaff.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Thông tin chi tiết</h3>
                  <button onClick={() => setSelectedStaff(null)} className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={20} /></button>
                </div>

                <div className="space-y-4 mb-8">
                  <InfoRow label="Email liên hệ" value={selectedStaff.email} icon={<Mail size={14} />} />
                  <div className="flex items-center justify-between p-4 rounded-[24px] bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="text-gold opacity-60 group-hover:opacity-100 transition-all"><Shield size={14} /></div>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Phân quyền</span>
                    </div>
                    <select 
                      value={selectedStaff.role}
                      onChange={(e) => handleUpdateRole(selectedStaff.id, e.target.value as any)}
                      className="bg-transparent border-none outline-none text-sm font-black text-gold cursor-pointer text-right"
                    >
                      <option value="01" className="bg-sidebar">01 - ADMIN</option>
                      <option value="02" className="bg-sidebar">02 - QUẢN LÝ CÔNG VIỆC</option>
                      <option value="03" className="bg-sidebar">03 - QUẢN LÝ NHÂN SỰ</option>
                      <option value="04" className="bg-sidebar">04 - NHÂN VIÊN CHÍNH THỨC</option>
                    </select>
                  </div>
                  <InfoRow label="Trạng thái" value={selectedStaff.status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "ĐÃ BỊ KHÓA"} icon={<Activity size={14} />} />
                  <InfoRow label="Hoạt động" value={selectedStaff.lastActive || "---"} icon={<Clock size={14} />} />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ClipboardList size={14} className="text-gold" /> Nhật ký hoạt động gần đây
                  </h4>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/10 flex items-center justify-center text-gold shrink-0"><Clock size={12} /></div>
                        <div>
                          <p className="text-xs font-bold text-white">Hoàn thành nhiệm vụ xử lý mail #{i}24</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Khoảng 2 giờ trước</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colorStyles: any = {
    blue: "from-blue-600/20 to-blue-900/40 text-blue-400 border-blue-500/20",
    green: "from-green-600/20 to-green-900/40 text-green-400 border-green-500/20",
    gray: "from-gray-600/20 to-gray-900/40 text-gray-400 border-gray-500/20",
    red: "from-red-600/20 to-red-900/40 text-red-400 border-red-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative overflow-hidden rounded-[32px] border p-6 bg-gradient-to-br ${colorStyles[color]} shadow-2xl group transition-all`}
    >
      <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">{title}</p>
          <h3 className="text-4xl font-black tracking-tighter text-white">{value}</h3>
        </div>
        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value, icon }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
      <div className="flex items-center gap-3">
        <div className="text-gold opacity-60 group-hover:opacity-100 transition-all">{icon}</div>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs font-black text-white">{value}</span>
    </div>
  );
}
