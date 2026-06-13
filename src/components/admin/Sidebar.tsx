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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isCollapsed: boolean;
  user: any;
  windowWidth?: number;
}

const Sidebar = ({ isCollapsed, user, windowWidth }: SidebarProps) => {
  const [brandName, setBrandName] = React.useState("AQ MEDIA");
  const [rulesUrl, setRulesUrl] = React.useState("");

  React.useEffect(() => {
    const updateBrand = () => {
      const savedConfig = localStorage.getItem("global_agency_config");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (parsed.name) {
            setBrandName(parsed.name);
          }
          if (parsed.rulesUrl) {
            setRulesUrl(parsed.rulesUrl);
          }
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
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager = roleUpper === "01" || 
    roleUpper === "ADMIN" || 
    roleUpper === "02" || 
    roleUpper === "QL CÔNG VIỆC" || 
    roleUpper === "QUẢN LÝ CÔNG VIỆC";
  
  const isStaffOnly = roleUpper === "03" || roleUpper === "04";

  const isMinimalRole = isStaffOnly || 
    roleUpper === "05" || 
    roleUpper === "QL NHÂN SỰ" || 
    roleUpper === "QUẢN LÝ NHÂN SỰ" || 
    roleUpper === "NHÂN VIÊN" ||
    roleUpper === "NV THỬ VIỆC";

  const dynamicMenuItems: any[] = [
    { title: "Dashboard", icon: <Gauge size={20} />, href: "/admin" },
    { title: "Bảng Tin", icon: <MessageSquare size={20} />, href: "/admin/newsfeed" },
  ];

  // Only show Apps for non-staff roles (01, 02, 05 etc.) if not 03/04
  if (!isStaffOnly) {
    dynamicMenuItems.push({
      title: "Ứng dụng",
      icon: <Blocks size={20} />,
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
          icon: <Mail size={14} className="text-[#a07800] shrink-0" /> 
        }
      ]
    });
  }

  if (isMinimalRole) {
    dynamicMenuItems.push({
      title: "Quản lý mail",
      icon: <Mail size={20} />,
      subItems: [
        { title: "Danh sách Mail Vệ Tinh", href: "/admin/mail/satellite" },
        { title: "Danh sách SĐT", href: "/admin/phone/list" }
      ]
    });
  } else if (!isMinimalRole) {
    dynamicMenuItems.push({
      title: "Kho mail và SĐT",
      icon: <Inbox size={20} />,
      subItems: [
        { title: "Mail gốc", href: "/admin/mail/root" },
        { title: "Mail bật kiếm tiền", href: "/admin/mail/monetized" },
        { title: "Quản lý Lô (Batches)", href: "/admin/mail/batches" },
        { title: "Quản lý lô SĐT", href: "/admin/phone/batches" },
      ],
    });
    dynamicMenuItems.push({
      title: "Quản lý lô Mail",
      icon: <Layers size={20} />,
      subItems: [
        { title: "Mail vệ tinh", href: "/admin/mail/satellite" },
        { title: "Lô mail vệ tinh", href: "/admin/mail/satellite-batches" },
      ],
    });
  }

  if (isAdminOrManager || isStaffOnly) {
    dynamicMenuItems.push({
      title: "Phân công",
      icon: <ClipboardList size={20} />,
      href: "/admin/tasks",
    });
  }

  if (!isStaffOnly) {
    dynamicMenuItems.push({
      title: "Nhân sự",
      icon: <Users size={20} />,
      href: "/admin/staff",
    });
  }

  if (isAdminOrManager) {
    dynamicMenuItems.push({
      title: "Báo cáo đi muộn",
      icon: <FileText size={20} />,
      href: "/admin/fines-report",
    });
  }

  if (isAdminOrManager) {
    dynamicMenuItems.push({
      title: "Theo dõi & Thống kê",
      icon: <BarChart3 size={20} />,
      subItems: [
        { title: "Nhật ký hoạt động", href: "/admin/stats/logs" },
        { title: "Thống Kê & Nhân Sự", href: "/admin/stats/report" },
      ],
    });
  }

  if (rulesUrl) {
    dynamicMenuItems.push({
      title: "Nội quy công ty",
      icon: <FileText size={20} />,
      href: rulesUrl,
      isExternal: true
    });
  }

  dynamicMenuItems.push({
    title: "Hệ thống",
    icon: <Settings size={20} />,
    href: "/admin/settings",
  });

  const toggleMenu = (title: string) => {
    if (isCollapsed) return;
    setOpenMenus((prev) =>
      prev.includes(title)
        ? (prev || []).filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    if (role === "04") return "NHÂN VIÊN";
    if (role === "05") return "NV THỬ VIỆC";
    return "GUEST";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? (windowWidth && windowWidth < 640 ? 0 : 80) : 280 }}
      className="fixed left-0 top-0 z-50 h-screen border-r border-white/0 bg-[#18181b] text-zinc-100 flex flex-col shadow-xl"
    >
      {/* Logo */}
      <div className={cn("flex h-20 items-center transition-all duration-300",
        isCollapsed ? "justify-center" : "px-6"
      )}>
        <div className={cn("flex items-center justify-center rounded-xl bg-zinc-800/40 border border-zinc-700/50 overflow-hidden transition-all",
          isCollapsed ? "h-11 w-11" : "h-12 w-12"
        )}>
          <img src="/logo.png" alt="AQ" className="h-full w-full object-contain p-1" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/a07800/000000?text=AQ"} />
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-lg font-bold tracking-tight text-zinc-100 whitespace-nowrap">
            <span className="text-amber-500 uppercase tracking-widest text-sm font-black truncate max-w-[190px]">{brandName}</span>
          </span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
        {(dynamicMenuItems || []).map((item) => {
          const hasSubItems = item.subItems && (item.subItems || []).length > 0;
          const isOpen = openMenus.includes(item.title);
          const isActive = pathname === item.href || (hasSubItems && item.subItems?.some((sub: any) => sub.href === pathname));

          return (
            <div key={item.title} className="space-y-0.5">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn("group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-zinc-800/50 hover:text-zinc-300",
                    (isOpen || isActive) && !isCollapsed ? "text-[#a07800] bg-zinc-800/30" : "text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={cn("flex-shrink-0 transition-colors", (isOpen || isActive) ? "text-[#a07800]" : "group-hover:text-zinc-200")}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={14} />
                    </motion.div>
                  )}
                </button>
              ) : item.isExternal ? (
                <a
                  href={item.href || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-zinc-800/50 hover:text-zinc-300 text-zinc-400"
                >
                  <span className="flex-shrink-0 transition-colors group-hover:text-zinc-200">
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.title}</span>}
                </a>
              ) : (
                <Link
                  href={item.href || "#"}
                  className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-zinc-800/50 hover:text-zinc-300",
                    pathname === item.href ? "bg-zinc-800 text-[#a07800] border-l-2 border-[#a07800] rounded-l-none" : "text-zinc-400"
                  )}
                >
                  <span className={cn("flex-shrink-0 transition-colors", pathname === item.href ? "text-[#a07800]" : "group-hover:text-zinc-200")}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.title}</span>}
                </Link>
              )}

              <AnimatePresence>
                {hasSubItems && isOpen && !isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-8 pl-2 border-l border-white/0 space-y-1 overflow-hidden"
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
                            key={sub.title} 
                            href={sub.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-300 flex items-center"
                          >
                            {subContent}
                          </a>
                        );
                      }
                      return (
                        <Link
                          key={sub.title} 
                          href={sub.href}
                          className={cn("block rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:text-zinc-300",
                            pathname === sub.href ? "text-[#a07800] bg-zinc-800/30 font-bold" : "text-zinc-500"
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

      {/* User Profile at bottom */}
      <div className="border-t border-white/0 p-3 bg-zinc-900/[0.05] space-y-2">
        <div className={cn("flex items-center justify-between rounded-2xl p-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300 group",
          isCollapsed && "flex-col gap-3"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 border border-zinc-700/50 group-hover:border-zinc-600 transition-all overflow-hidden shadow-sm">
              {user?.avatar ? (
                <img src={user?.avatar} alt="" className="h-full w-full object-cover" onError={(e) => e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (user?.name || "U") + "&background=18181b&color=a07800"} />
              ) : (
                <UserCircle size={24} />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[8px] font-bold text-[#a07800] uppercase tracking-wider">{getRoleLabel(user?.role)}</span>
                <span className="text-sm font-semibold text-zinc-100 truncate">{user?.name || "GUEST"}</span>
                <span className="text-[8px] font-medium text-zinc-500 tracking-wider truncate">@{user?.username || "unknown"}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={handleLogout}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
