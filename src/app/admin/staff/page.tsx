"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  UserCheck
} from "lucide-react";
import { MOCK_STAFF_ATTENDANCE } from "@/data/mockData";

export default function StaffManagementPage() {
  const router = useRouter();

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/admin")}
            className="p-3 rounded-2xl bg-sidebar border border-border-custom text-gray-400 hover:text-white transition-all shadow-xl"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
              <UserCheck className="text-gold" size={32} />
              Nhân viên Online & Chấm công
            </h1>
            <p className="text-gray-500 font-medium">Theo dõi thời gian làm việc thực tế của đội ngũ</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/5 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
             <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
             <span className="text-sm font-bold text-white">12 Nhân viên đang Online</span>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 rounded-[32px] border border-border-custom bg-sidebar flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20 bg-[#121212]">
              <tr className="bg-white/5 border-b border-border-custom shadow-sm">
                <th className="px-6 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-border-custom w-[5%] text-center">STT</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-border-custom w-[20%]">Tên Nhân Viên</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-border-custom w-[15%]">Vai Trò</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-border-custom w-[20%]">Sáng (In - Out)</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-border-custom w-[20%]">Chiều (In - Out)</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-border-custom w-[10%] text-center">Tổng Giờ</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest w-[10%] text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {MOCK_STAFF_ATTENDANCE.map((staff, idx) => {
                const isCompliant = staff.totalHours >= 8;
                return (
                  <tr key={staff.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-gray-600 border-r border-border-custom text-center">
                      {idx + 1}
                    </td>
                    <td className="px-8 py-4 border-r border-border-custom">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm ${isCompliant ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {staff.name.charAt(0)}
                        </div>
                        <span className="text-white font-bold text-lg">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 border-r border-border-custom">
                      <span className="text-sm font-bold text-gold uppercase tracking-tighter bg-gold/5 px-3 py-1 rounded-lg border border-gold/10">
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-8 py-4 border-r border-border-custom text-gray-400 font-mono text-sm">
                      {staff.morning}
                    </td>
                    <td className="px-8 py-4 border-r border-border-custom text-gray-400 font-mono text-sm">
                      {staff.afternoon}
                    </td>
                    <td className="px-8 py-4 border-r border-border-custom text-center">
                      <div className={`text-xl font-black ${isCompliant ? 'text-green-500' : 'text-orange-500'}`}>
                        {staff.totalHours}h
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex justify-center">
                        {isCompliant ? (
                          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-lg shadow-green-500/10">
                            <CheckCircle2 size={24} />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10 group-hover:animate-bounce">
                            <AlertCircle size={24} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-10 py-5 border-t border-border-custom bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đủ 8 tiếng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Thiếu giờ làm</span>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 italic">Dữ liệu được cập nhật tự động từ hệ thống vân tay/login</p>
        </div>
      </div>
    </div>
  );
}
