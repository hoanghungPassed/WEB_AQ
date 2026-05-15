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
  History,
  Briefcase,
  UserCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/admin",
  },
  {
    title: "Quản lý mail",
    icon: <Mail size={20} />,
    subItems: [
      { title: "Mail gốc", href: "/admin/mail/root" },
      { title: "Mail vệ tinh", href: "/admin/mail/satellite" },
      { title: "Mail bật kiếm tiền", href: "/admin/mail/monetized" },
    ],
  },
  {
    title: "Nhân sự & Phân việc",
    icon: <Users size={20} />,
    subItems: [
      { title: "Nhân viên", href: "/admin/hr/employees" },
      { title: "Chia việc", href: "/admin/hr/tasks" },
    ],
  },
  {
    title: "Theo dõi & Thống kê",
    icon: <BarChart3 size={20} />,
    subItems: [
      { title: "Nhật ký hoạt động", href: "/admin/stats/logs" },
      { title: "Thống kê", href: "/admin/stats/report" },
    ],
  },
  {
    title: "Hệ thống",
    icon: <Settings size={20} />,
    href: "/admin/settings",
  },
];

const Sidebar = () => {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(["Quản lý mail"]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[250px] flex-col border-r border-border-custom bg-sidebar text-white flex">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <span className="text-2xl font-bold tracking-wider text-gold">
          AQ MEDIA
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.title);
          const isActive = pathname === item.href || (hasSubItems && item.subItems?.some(sub => sub.href === pathname));

          return (
            <div key={item.title} className="space-y-1">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-gold",
                    isOpen || isActive ? "text-gold" : "text-gray-400"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("transition-colors", (isOpen || isActive) ? "text-gold" : "group-hover:text-gold")}>
                      {item.icon}
                    </span>
                    {item.title}
                  </div>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <Link
                  href={item.href || "#"}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-gold",
                    pathname === item.href ? "bg-white/5 text-gold" : "text-gray-400"
                  )}
                >
                  <span className={cn("transition-colors", pathname === item.href ? "text-gold" : "group-hover:text-gold")}>
                    {item.icon}
                  </span>
                  {item.title}
                </Link>
              )}

              {/* Sub-menu */}
              {hasSubItems && isOpen && (
                <div className="ml-9 space-y-1">
                  {item.subItems?.map((sub) => (
                    <Link
                      key={sub.title}
                      href={sub.href}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:text-gold",
                        pathname === sub.href ? "text-gold" : "text-gray-500"
                      )}
                    >
                      {sub.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info / Profile at bottom */}
      <div className="border-t border-border-custom p-4">
        <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5 cursor-pointer group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
            <UserCircle size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white group-hover:text-gold transition-colors">Admin AQ</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Senior Developer</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
