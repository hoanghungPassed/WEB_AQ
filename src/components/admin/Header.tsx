"use client";

import React from "react";
import { Search, Bell, Menu, User, PanelLeftClose, PanelLeftOpen, LogOut, UserSearch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  user: { name: string; role: string } | null;
}

const Header = ({ isCollapsed, onToggle, onOpenProfile, user }: HeaderProps) => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const router = React.useRef(typeof window !== 'undefined' ? require('next/navigation').useRouter() : null);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <motion.header 
      animate={{ width: isCollapsed ? "calc(100% - 100px)" : "calc(100% - 320px)" }}
      className="fixed top-0 right-0 z-30 flex h-20 items-center justify-between border-b border-border-custom bg-header/80 backdrop-blur-md px-10"
    >
      <div className="flex items-center gap-8 flex-1">
        {/* Toggle Button */}
        <button 
          onClick={onToggle}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar border border-border-custom text-gray-400 hover:text-gold hover:border-gold transition-all shadow-lg"
        >
          {isCollapsed ? <PanelLeftOpen size={24} /> : <PanelLeftClose size={24} />}
        </button>

        {/* Search Bar */}
        <div className="flex w-full max-w-xl items-center gap-4">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm mọi thứ trong AQ MEDIA..."
              className="h-14 w-full rounded-2xl border border-border-custom bg-background/50 pl-12 pr-6 text-base text-white placeholder-gray-500 transition-all focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/10"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-8">
        {/* Notifications */}
        <button className="relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-white/5 hover:text-gold border border-transparent hover:border-border-custom">
          <Bell size={26} />
          <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-red-500 ring-4 ring-header animate-pulse"></span>
        </button>

        {/* User Profile */}
        <div className="relative flex items-center gap-4 pl-8 border-l border-border-custom">
          <div className="text-right hidden lg:block">
            <p className="text-base font-bold text-white leading-none">{user?.role || "GUEST"}</p>
            <p className="text-xs font-medium text-gray-400 mt-1.5 uppercase tracking-widest">{user?.name || "Người dùng"}</p>
          </div>
          
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-14 w-14 rounded-2xl border-2 border-gold/20 bg-gold/5 p-1 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gold hover:bg-gold/10 transition-all shadow-xl active:scale-95"
          >
            <div className="h-full w-full rounded-xl bg-sidebar flex items-center justify-center text-gold">
               <User size={28} />
            </div>
          </div>

          {/* User Dropdown */}
          <AnimatePresence>
            {isProfileOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsProfileOpen(false)}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-4 z-20 w-64 rounded-2xl border border-border-custom bg-sidebar p-2 shadow-2xl"
                >
                  <div className="p-4 border-b border-border-custom mb-2">
                    <p className="text-sm font-bold text-gold uppercase tracking-widest">{user?.role}</p>
                    <p className="text-xs text-white mt-1">{user?.name}</p>
                  </div>

                  <button 
                    onClick={() => {
                      onOpenProfile();
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gold"
                  >
                    <UserSearch size={18} />
                    Xem thông tin chi tiết
                  </button>
                  
                  <div className="h-px bg-border-custom my-2" />
                  
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={18} />
                    Đăng xuất
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
