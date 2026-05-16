"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  UserCircle,
  ShieldAlert,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isCollapsed: boolean;
  user: any;
}

const menuItems = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={24} />,
    href: "/admin",
  },
  {
    title: "Quản lý mail",
    icon: <Mail size={24} />,
    subItems: [
      { title: "Mail gốc", href: "/admin/mail/root" },
      { title: "Mail vệ tinh", href: "/admin/mail/satellite" },
      { title: "Mail bật kiếm tiền", href: "/admin/mail/monetized" },
    ],
  },
  {
    title: "Nhân sự & Phân việc",
    icon: <Users size={24} />,
    subItems: [
      { title: "Nhân viên", href: "/admin/staff" },
      { title: "Chia việc", href: "/admin/tasks" },
    ],
  },
  {
    title: "Theo dõi & Thống kê",
    icon: <BarChart3 size={24} />,
    subItems: [
      { title: "Nhật ký hoạt động", href: "/admin/stats/logs" },
      { title: "Thống kê", href: "/admin/stats/report" },
    ],
  },
  {
    title: "Phân quyền hệ thống",
    icon: <ShieldAlert size={24} />,
    href: "/admin/permissions",
  },
  {
    title: "Hệ thống",
    icon: <Settings size={24} />,
    href: "/admin/settings",
  },
];

const Sidebar = ({ isCollapsed, user }: SidebarProps) => {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(["Quản lý mail"]);

  const toggleMenu = (title: string) => {
    if (isCollapsed) return;
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    if (role === "04") return "NHÂN VIÊN";
    return "GUEST";
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 100 : 320 }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-white/5 bg-sidebar text-white flex flex-col shadow-2xl"
    >
      {/* Logo */}
      <div className={cn(
        "flex h-24 items-center transition-all duration-300",
        isCollapsed ? "justify-center" : "px-8"
      )}>
        <div className={cn(
          "flex items-center justify-center rounded-2xl bg-gold/5 border border-gold/10 overflow-hidden shadow-xl transition-all",
          isCollapsed ? "h-14 w-14" : "h-16 w-16"
        )}>
          <img src="/logo.png" alt="AQ" className="h-full w-full object-contain p-1" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
        </div>
        {!isCollapsed && (
          <span className="ml-4 text-2xl font-black tracking-tighter text-white whitespace-nowrap">
            AQ <span className="text-gold uppercase tracking-widest text-xl ml-1">MEDIA</span>
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-3 custom-scrollbar">
        {menuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.title);
          const isActive = pathname === item.href || (hasSubItems && item.subItems?.some(sub => sub.href === pathname));

          return (
            <div key={item.title} className="space-y-2">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-black uppercase tracking-widest transition-all hover:bg-white/[0.03]",
                    (isOpen || isActive) && !isCollapsed ? "text-gold bg-white/[0.03]" : "text-gray-500"
                  )}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <span className={cn("flex-shrink-0 transition-colors", (isOpen || isActive) ? "text-gold" : "group-hover:text-gold")}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="whitespace-nowrap">{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} />
                    </motion.div>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href || "#"}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-black uppercase tracking-widest transition-all hover:bg-white/[0.03]",
                    pathname === item.href ? "bg-gold/5 text-gold shadow-lg shadow-gold/5" : "text-gray-500"
                  )}
                >
                  <span className={cn("flex-shrink-0 transition-colors", pathname === item.href ? "text-gold" : "group-hover:text-gold")}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="whitespace-nowrap">{item.title}</span>}
                </Link>
              )}

              <AnimatePresence>
                {hasSubItems && isOpen && !isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="ml-12 space-y-2 overflow-hidden"
                  >
                    {item.subItems?.map((sub) => (
                      <Link
                        key={sub.title} href={sub.href}
                        className={cn(
                          "block rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors hover:text-gold",
                          pathname === sub.href ? "text-gold bg-gold/5" : "text-gray-600"
                        )}
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User Profile at bottom */}
      <div className="border-t border-white/5 p-6 bg-white/[0.01]">
        <div className={cn(
          "flex items-center justify-between rounded-3xl p-3 transition-colors hover:bg-white/5 group",
          isCollapsed && "flex-col gap-4"
        )}>
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold border border-gold/20 group-hover:border-gold transition-all overflow-hidden shadow-lg">
              {user?.avatar ? (
                <img src={user.avatar} className="h-full w-full object-cover" />
              ) : (
                <UserCircle size={28} />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em]">{getRoleLabel(user?.role)}</span>
                <span className="text-sm font-black text-white truncate">{user?.name || "GUEST"}</span>
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter truncate">@{user?.username || "unknown"}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={handleLogout}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
