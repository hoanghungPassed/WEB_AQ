"use client";

import React from "react";
import { Search, Bell, Menu, User } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 right-0 z-30 flex h-16 w-[calc(100%-250px)] items-center justify-between border-b border-border-custom bg-header px-8">
      {/* Search Bar */}
      <div className="flex w-full max-w-md items-center gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm mọi thứ..."
            className="h-10 w-full rounded-full border border-border-custom bg-background pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-all focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gold">
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-header"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-border-custom">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white leading-none">Hoàng Hùng</p>
            <p className="text-[10px] text-gray-500 mt-1">Super Admin</p>
          </div>
          <div className="h-10 w-10 rounded-full border border-gold/30 bg-gold/10 p-0.5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gold transition-colors">
            <div className="h-full w-full rounded-full bg-sidebar flex items-center justify-center text-gold">
               <User size={20} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
