"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Mail, 
  Users, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  UserCircle,
  ShieldAlert,
  LogOut,
  ClipboardList,
  RotateCcw,
  Play,
  Globe,
  Gauge,
  Blocks,
  Inbox,
  Layers,
  MessageSquare,
  FileText
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
  windowWidth?: number;
}

const Sidebar = ({ isCollapsed, user, windowWidth }: SidebarProps) => {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(["Kho mail", "Kho mail và SĐT", "Quản lý mail", "Quản lý lô Mail"]);

  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager = roleUpper === "01" || 
                           roleUpper === "ADMIN" || 
                           roleUpper === "02" || 
                           roleUpper === "QL CÔNG VIỆC" || 
                           roleUpper === "QUẢN LÝ CÔNG VIỆC";
  const isMinimalRole = roleUpper === "03" || 
                         roleUpper === "04" || 
                         roleUpper === "QL NHÂN SỰ" || 
                         roleUpper === "QUẢN LÝ NHÂN SỰ" || 
                         roleUpper === "NHÂN VIÊN";

  const dynamicMenuItems: any[] = [
    { title: "Dashboard", icon: <Gauge size={24} />, href: "/admin" },
    { title: "Bảng Tin", icon: <MessageSquare size={24} />, href: "/admin/newsfeed" },
    {
      title: "Ứng dụng",
      icon: <Blocks size={24} />,
      subItems: [
        { 
          title: "Youtube Studio", 
          href: "https://studio.youtube.com/", 
          isExternal: true, 
          icon: <Play size={14} className="text-red-500 shrink-0" /> 
        },
        { 
          title: "Google Brand", 
          href: "https://myaccount.google.com/brandaccounts", 
          isExternal: true, 
          icon: <Globe size={14} className="text-blue-400 shrink-0" /> 
        },
        { 
          title: "Gmail", 
          href: "https://accounts.google.com/Login?btmpl=mobile_tier2&hl=vi&service=mail", 
          isExternal: true, 
          icon: <Mail size={14} className="text-yellow-500 shrink-0" /> 
        }
      ]
    }
  ];

  if (isMinimalRole) {
    dynamicMenuItems.push({
      title: "Quản lý mail",
      icon: <Mail size={24} />,
      subItems: [
        { title: "Danh sách Mail Vệ Tinh", href: "/admin/mail/satellite" },
        { title: "Danh sách SĐT", href: "/admin/phone/list" }
      ]
    });
  } else {
    dynamicMenuItems.push({
      title: "Kho mail và SĐT",
      icon: <Inbox size={24} />,
      subItems: [
        { title: "Mail gốc", href: "/admin/mail/root" },
        { title: "Mail bật kiếm tiền", href: "/admin/mail/monetized" },
        { title: "Quản lý Lô (Batches)", href: "/admin/mail/batches" },
        { title: "Quản lý lô SĐT", href: "/admin/phone/batches" },
      ],
    });
    dynamicMenuItems.push({
      title: "Quản lý lô Mail",
      icon: <Layers size={24} />,
      subItems: [
        { title: "Mail vệ tinh", href: "/admin/mail/satellite" },
        { title: "Lô mail vệ tinh", href: "/admin/mail/satellite-batches" },
      ],
    });
  }

  if (isAdminOrManager) {
    dynamicMenuItems.push({
      title: "Phân công",
      icon: <ClipboardList size={24} />,
      href: "/admin/tasks",
    });
  }

  dynamicMenuItems.push({
    title: "Nhân sự",
    icon: <Users size={24} />,
    href: "/admin/staff",
  });

  if (isAdminOrManager) {
    dynamicMenuItems.push({
      title: "Báo cáo đi muộn",
      icon: <FileText size={24} />,
      href: "/admin/fines-report",
    });
  }

  if (isAdminOrManager) {
    dynamicMenuItems.push({
      title: "Theo dõi & Thống kê",
      icon: <BarChart3 size={24} />,
      subItems: [
        { title: "Nhật ký hoạt động", href: "/admin/stats/logs" },
        { title: "Thống kê", href: "/admin/stats/report" },
      ],
    });
  }

  dynamicMenuItems.push({
    title: "Hệ thống",
    icon: <Settings size={24} />,
    href: "/admin/settings",
  });

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
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleResetDatabase = async () => {
    const confirmReset = window.confirm(
      "Bạn có chắc chắn muốn khôi phục toàn bộ cơ sở dữ liệu về trạng thái mặc định ban đầu không? Mọi thay đổi về phân công, trạng thái mail, tài khoản... sẽ bị reset."
    );
    if (!confirmReset) return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keysToRemove.push(key);
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      await fetch("/api/sync", { method: "DELETE" });

      const { MOCK_STAFF, MOCK_MAILS, MOCK_TASK_ASSIGNMENTS, MOCK_KPI_DATA } = await import("@/data/mockData");
      
      localStorage.setItem("global_users", JSON.stringify(MOCK_STAFF));
      localStorage.setItem("global_mails_data", JSON.stringify(MOCK_MAILS));
      localStorage.setItem("global_tasks_data", JSON.stringify(MOCK_TASK_ASSIGNMENTS));
      localStorage.setItem("global_kpi_data", JSON.stringify(MOCK_KPI_DATA));
      localStorage.setItem("admin_notifications", JSON.stringify([]));
      localStorage.setItem("pending_access_requests", JSON.stringify([]));

      const resetPayload = {
        global_users: JSON.stringify(MOCK_STAFF),
        global_mails_data: JSON.stringify(MOCK_MAILS),
        global_tasks_data: JSON.stringify(MOCK_TASK_ASSIGNMENTS),
        global_kpi_data: JSON.stringify(MOCK_KPI_DATA),
        admin_notifications: JSON.stringify([]),
        realtime_toast: JSON.stringify({ userId: "all", message: "Hệ thống đã được khôi phục dữ liệu gốc!" }),
        pending_access_requests: JSON.stringify([])
      };

      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetPayload)
      });

      window.dispatchEvent(new Event("storage"));
      alert("Khôi phục dữ liệu gốc thành công! Toàn bộ hệ thống đã được đồng bộ lại.");
      window.location.reload();
    } catch (err) {
      console.error("Reset error:", err);
      alert("Đã xảy ra lỗi khi khôi phục dữ liệu.");
    }
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? (windowWidth && windowWidth < 640 ? 70 : 100) : 320 }}
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
        {dynamicMenuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.title);
          const isActive = pathname === item.href || (hasSubItems && item.subItems?.some((sub: any) => sub.href === pathname));

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
                    {item.subItems?.map((sub: any) => {
                      const subContent = (
                        <div className="flex items-center gap-2">
                          {sub.icon && <span className="flex-shrink-0">{sub.icon}</span>}
                          <span>{sub.title}</span>
                        </div>
                      );
                      if (sub.isExternal) {
                        return (
                          <a
                            key={sub.title} href={sub.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all hover:text-gold text-gray-600 hover:bg-white/[0.02] flex items-center"
                          >
                            {subContent}
                          </a>
                        );
                      }
                      return (
                        <Link
                          key={sub.title} href={sub.href}
                          className={cn(
                            "block rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors hover:text-gold",
                            pathname === sub.href ? "text-gold bg-gold/5" : "text-gray-600"
                          )}
                        >
                          {subContent}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Reset Mock Data & User Profile at bottom */}
      <div className="border-t border-white/5 p-6 bg-white/[0.01] space-y-4">
        {/* Reset Database Button */}
        <button
          onClick={handleResetDatabase}
          className={cn(
            "flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-gold hover:text-white bg-gold/5 hover:bg-gold/80 border border-gold/20 hover:border-gold transition-all duration-300 shadow-lg shadow-gold/5",
            isCollapsed ? "justify-center px-0 h-12 w-12" : "h-12"
          )}
          title="Khôi phục dữ liệu gốc"
        >
          <RotateCcw size={16} className="flex-shrink-0 animate-pulse" />
          {!isCollapsed && <span className="whitespace-nowrap">Khôi phục dữ liệu gốc</span>}
        </button>

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
