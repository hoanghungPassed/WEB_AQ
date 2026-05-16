"use client";

import React, { useState, useEffect } from "react";
import { Shield, User, Edit3, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROLES = ["ADMIN", "QUẢN LÝ CÔNG VIỆC", "QUẢN LÝ NHÂN SỰ", "NHÂN VIÊN"];

export default function PermissionsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const allUsers = JSON.parse(localStorage.getItem("all_users") || "[]");
    setUsers(allUsers);
  }, []);

  const handleRoleChange = (index: number, newRole: string) => {
    const updatedUsers = [...users];
    updatedUsers[index].role = newRole;
    setUsers(updatedUsers);
    localStorage.setItem("all_users", JSON.stringify(updatedUsers));
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter">Phân quyền hệ thống</h1>
          <p className="text-xl text-gray-500 mt-3 font-medium">Quản lý danh sách nhân sự và cấp quyền truy cập</p>
        </div>
        <div className="bg-gold/10 border border-gold/20 px-8 py-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-gold/5">
          <Shield className="text-gold" size={32} />
          <span className="text-white font-bold uppercase tracking-widest text-base">Bảo mật hệ thống</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-[32px] border border-border-custom bg-sidebar overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-header/50 border-b border-border-custom">
                <th className="px-10 py-8 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Người dùng</th>
                <th className="px-10 py-8 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Email</th>
                <th className="px-10 py-8 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Chức vụ hiện tại</th>
                <th className="px-10 py-8 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-medium italic">
                    Chưa có nhân sự nào đăng ký tài khoản.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-gold/5 border border-gold/20 flex items-center justify-center text-gold text-2xl font-black">
                          {user.name?.charAt(0)}
                        </div>
                        <span className="text-white font-bold text-xl">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-gray-400 font-medium text-lg">{user.email}</td>
                    <td className="px-8 py-6">
                      <AnimatePresence mode="wait">
                        {editingId === idx.toString() ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex items-center gap-2"
                          >
                            {ROLES.map(role => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(idx, role)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                                  user.role === role ? "bg-gold text-sidebar" : "bg-white/10 text-gray-400 hover:bg-gold/20 hover:text-gold"
                                )}
                              >
                                {role}
                              </button>
                            ))}
                          </motion.div>
                        ) : (
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                              user.role === "ADMIN" ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
                              user.role === "QUẢN LÝ" ? "bg-gold/10 text-gold border border-gold/20" : 
                              "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            )}
                          >
                            {user.role}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => setEditingId(editingId === idx.toString() ? null : idx.toString())}
                        className="flex items-center gap-2 text-gray-500 hover:text-gold transition-colors font-bold text-sm"
                      >
                        <Edit3 size={18} />
                        {editingId === idx.toString() ? "Hủy bỏ" : "Đổi quyền"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
