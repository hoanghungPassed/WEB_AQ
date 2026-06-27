"use client";

import React, { useState } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StaffData } from "@/types/admin";
import { clearAllLocalStorage } from "@/lib/clientUtils";

interface HeaderUserMenuProps {
  user: StaffData;
  onOpenProfile: () => void;
}

export default function HeaderUserMenu({ user, onOpenProfile }: HeaderUserMenuProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error("Logout API error:", err);
    }
    clearAllLocalStorage();
    window.location.href = "/login";
  };

  const getRoleLabel = (role?: string) => {
    const r = String(role || "").toUpperCase();
    if (r === "01" || r === "ADMIN") return "ADMIN";
    if (r === "02" || r === "QL CÔNG VIỆC") return "QL CÔNG VIỆC";
    if (r === "03" || r === "QL NHÂN SỰ") return "QL NHÂN SỰ";
    if (r === "04" || r === "NHÂN VIÊN") return "NHÂN VIÊN";
    if (r === "05" || r === "NV THỬ VIỆC") return "NV THỬ VIỆC";
    return "GUEST";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="flex items-center gap-3 p-1.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
      >
        <div className="h-10 w-10 rounded-xl bg-background border border-border overflow-hidden flex items-center justify-center">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <User size={20} className="text-gray-500" />
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start pr-2">
          <span className="text-[10px] font-black text-gold uppercase tracking-widest leading-none mb-1 inline-block max-w-[100px] truncate">
            {getRoleLabel(user?.role)}
          </span>
          <span className="text-xs font-bold text-white group-hover:text-gold transition-colors inline-block max-w-[100px] truncate">
            {user?.name || "Người dùng"}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isProfileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-56 rounded-2xl bg-background-secondary border border-border shadow-premium z-20 overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-black/20">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Đang đăng nhập</p>
                <p className="text-sm font-bold text-white truncate">{user?.email || user?.username}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { setIsProfileOpen(false); onOpenProfile(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User size={16} className="text-gold" />
                  Hồ sơ cá nhân
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
