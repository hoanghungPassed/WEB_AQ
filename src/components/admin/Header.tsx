"use client";

import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import HeaderNotifications from "./HeaderNotifications";
import HeaderUserMenu from "./HeaderUserMenu";
import HeaderClock from "./HeaderClock";
import { StaffData } from "@/types/admin";

interface HeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  user: StaffData;
}

const Header = ({ isCollapsed, onToggle, onOpenProfile, user }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 h-20 w-full bg-background/80 backdrop-blur-xl border-b border-border px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <button
          onClick={onToggle}
          className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
          title={isCollapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={20} className="text-gold group-hover:scale-110 transition-transform" />
          ) : (
            <PanelLeftClose size={20} className="text-gray-400 group-hover:text-gold transition-colors" />
          )}
        </button>
        
        <HeaderClock />
      </div>

      <div className="flex items-center gap-4">
        <HeaderNotifications user={user} />
        
        <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
        
        <HeaderUserMenu user={user} onOpenProfile={onOpenProfile} />
      </div>
    </header>
  );
};

export default Header;
