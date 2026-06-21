"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Mail, 
  Users, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  UserCircle,
  LogOut,
  ClipboardList,
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
import { StaffData } from "@/types/admin";
import { clearAllLocalStorage } from "@/lib/clientUtils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isCollapsed: boolean;
  user: StaffData;
}

const Sidebar = ({ isCollapsed, user }: SidebarProps) => {
  const [brandName, setBrandName] = useState("AQ MEDIA");
  const [rulesUrl, setRulesUrl] = useState("");
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  useEffect(() => {
    const updateBrand = () => {
      const savedConfig = localStorage.getItem("global_agency_config");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (parsed.name) setBrandName(parsed.name);
          if (parsed.rulesUrl) setRulesUrl(parsed.rulesUrl);
        } catch (e) {}
      }
    };
    updateBrand();

    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (json.data.brandName) setBrandName(json.data.brandName);
            if (json.data.rulesUrl) setRulesUrl(json.data.rulesUrl);
          }
        }
      } catch (err) {
        console.error("Sidebar settings fetch failed:", err);
      }
    };
    fetchSettings();

    window.addEventListener("storage", updateBrand);
    return () => window.removeEventListener("storage", updateBrand);
  }, []);

  const roleUpper = String(user?.role || "").toUpperCase();
  const isManager = ["01", "02", "03"].includes(user?.role || "");
  const isAdminOrManager = ["01", "02", "ADMIN"].some(r => roleUpper.includes(r));
  const isStaffOnly = roleUpper === "03" || roleUpper === "04";
  const isMinimalRole = isStaffOnly || ["05", "NHÂN VIÊN", "NV THỬ VIỆC"].some(r => roleUpper.includes(r));

  const dynamicMenuItems: any[] = [];

  if (isManager) {
    dynamicMenuItems.push({ title: "Dashboard", icon: <Gauge size={20} />, href: "/admin" });
    dynamicMenuItems.push({ title: "Bảng Tin", icon: <MessageSquare size={20} />, href: "/admin/newsfeed" });
    
    dynamicMenuItems.push({
      title: "Ứng dụng",
      icon: <Blocks size={20} />,
      subItems: [
        { title: "Youtube Studio", href: "https://studio.youtube.com/", isExternal: true, icon: <Play size={14} className="text-red-500 shrink-0" /> },
        { title: "Google Brand", href: "https://myaccount.google.com/brandaccounts", isExternal: true, icon: <Globe size={14} className="text-blue-400 shrink-0" /> },
        { title: "Gmail", href: "https://mail.google.com/", isExternal: true, icon: <Mail size={14} className="text-gold shrink-0" /> }
      ]
    });

    dynamicMenuItems.push({
      title: "Kho mail & SDT",
      icon: <Inbox size={20} />,
      subItems: [
        { title: "Mail gốc", href: "/admin/mail/root" },
        { title: "Mail vệ tinh", href: "/admin/mail/satellite" },
        { title: "Mail bật kiếm tiền", href: "/admin/mail/monetized" },
        { title: "Quản lý Lô", href: "/admin/mail/batches" },
        { title: "Lô SĐT", href: "/admin/phone/batches" },
      ],
    });

    dynamicMenuItems.push({
      title: "Quản lý phân lô",
      icon: <Layers size={20} />,
      href: "/admin/mail/satellite-batches"
    });

    dynamicMenuItems.push({ title: "Phân công", icon: <ClipboardList size={20} />, href: "/admin/tasks" });
    dynamicMenuItems.push({ title: "Nhân sự", icon: <Users size={20} />, href: "/admin/staff" });

    if (isAdminOrManager || user?.role === "03") {
      dynamicMenuItems.push({ title: "Báo cáo đi muộn", icon: <FileText size={20} />, href: "/admin/fines-report" });
      dynamicMenuItems.push({
        title: "Thống kê",
        icon: <BarChart3 size={20} />,
        subItems: [
          { title: "Nhật ký", href: "/admin/stats/logs" },
          { title: "Nhân sự", href: "/admin/stats/report" },
        ],
      });
    }

    if (rulesUrl) {
      dynamicMenuItems.push({ title: "Nội quy", icon: <FileText size={20} />, href: rulesUrl, isExternal: true });
    }

    dynamicMenuItems.push({ title: "Hệ thống", icon: <Settings size={20} />, href: "/admin/settings" });
  } else {
    // Staff menus
    dynamicMenuItems.push({ title: "Bảng điều khiển cá nhân", icon: <Gauge size={20} />, href: "/admin" });
    
    dynamicMenuItems.push({
      title: "Kho Mail của tôi",
      icon: <Mail size={20} />,
      subItems: [
        { title: "Mail Vệ Tinh", href: "/admin/mail/satellite" },
        { title: "SĐT", href: "/admin/phone/list" }
      ]
    });

    dynamicMenuItems.push({ title: "Thông báo", icon: <MessageSquare size={20} />, href: "/admin/newsfeed" });

    if (rulesUrl) {
      dynamicMenuItems.push({ title: "Nội quy", icon: <FileText size={20} />, href: rulesUrl, isExternal: true });
    }
  }

  const toggleMenu = (title: string) => {
    if (isCollapsed) return;
    setOpenMenus((prev) => prev.includes(title) ? prev.filter(i => i !== title) : [...prev, title]);
  };

  const handleLogout = () => {
    clearAllLocalStorage();
    window.location.href = "/login";
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    if (role === "04") return "NHÂN VIÊN";
    if (role === "05") return "NV THỬ VIỆC";
    return "GUEST";
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="fixed left-0 top-0 z-50 h-screen bg-background border-r border-border text-foreground flex flex-col shadow-2xl transition-colors duration-300"
    >
      {/* Logo */}
      <div className={cn("flex h-20 items-center transition-all duration-300", isCollapsed ? "justify-center" : "px-6")}>
        <div className={cn("flex items-center justify-center rounded-xl bg-background-secondary border border-border shadow-inner transition-all", isCollapsed ? "h-11 w-11" : "h-12 w-12")}>
          <img src="/logo.png" alt="AQ" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/fbbf24/000000?text=AQ"} />
        </div>
        {!isCollapsed && (
          <span className="ml-3 whitespace-nowrap overflow-hidden">
            <span className="text-gold font-bold uppercase tracking-widest text-sm">{brandName}</span>
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
        {dynamicMenuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.title);
          const isActive = pathname === item.href || (hasSubItems && item.subItems.some((sub: any) => sub.href === pathname));

          return (
            <div key={item.title} className="space-y-1">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn("group flex w-full items-center justify-between rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                    (isOpen || isActive) && !isCollapsed ? "text-gold bg-gold/5" : "text-foreground-secondary hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("transition-colors", (isOpen || isActive) ? "text-gold" : "group-hover:text-gold")}>{item.icon}</span>
                    {!isCollapsed && <span>{item.title}</span>}
                  </div>
                  {!isCollapsed && <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />}
                </button>
              ) : (
                <Link
                  href={item.href || "#"}
                  target={item.isExternal ? "_blank" : undefined}
                  className={cn("group flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                    pathname === item.href ? "text-gold bg-gold/10 shadow-lg shadow-gold/5 border-l-2 border-gold rounded-l-none" : "text-foreground-secondary hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className={cn("transition-colors", pathname === item.href ? "text-gold" : "group-hover:text-gold")}>{item.icon}</span>
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              )}

              <AnimatePresence>
                {hasSubItems && isOpen && !isCollapsed && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="ml-9 pl-4 border-l border-border space-y-1">
                    {item.subItems.map((sub: any) => (
                      <Link
                        key={sub.title} 
                        href={sub.href}
                        target={sub.isExternal ? "_blank" : undefined}
                        className={cn("block py-2 text-[9px] font-black uppercase tracking-widest transition-all",
                          pathname === sub.href ? "text-gold" : "text-foreground-secondary hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {sub.icon}
                          {sub.title}
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-4 border-t border-border bg-background-secondary/50">
        <div className={cn("flex items-center justify-between rounded-2xl p-2 transition-all hover:bg-white/5 group", isCollapsed && "flex-col")}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-background border border-border overflow-hidden shadow-inner">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gold"><UserCircle size={24} /></div>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-black text-gold uppercase tracking-widest truncate">{getRoleLabel(user?.role)}</span>
                <span className="text-xs font-bold text-white truncate">{user?.name}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={handleLogout} className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 transition-all">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
