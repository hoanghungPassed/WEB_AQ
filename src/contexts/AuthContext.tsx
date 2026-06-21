"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { StaffData } from "@/types/admin";
import { clearAllLocalStorage } from "@/lib/clientUtils";

interface AuthContextType {
  user: StaffData | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (userData: StaffData) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          clearAllLocalStorage();
        }
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  // Lắng nghe hoạt động để liên tục cập nhật lastActive lên server
  useEffect(() => {
    if (!user) return;
    let lastUpdate = Date.now();
    const handleActivity = () => {
      if (Date.now() - lastUpdate > 120 * 1000) {
        lastUpdate = Date.now();
        fetch("/api/auth/me").catch(() => {});
      }
    };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("click", handleActivity);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, [user]);

  // PHASE 3: BẮT SỰ KIỆN TẮT TRÌNH DUYỆT (Beacon API)
  useEffect(() => {
    if (!user) return;

    const handleUnload = () => {
      // Gửi tín hiệu Offline ngầm khi đóng tab/trình duyệt
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/auth/offline');
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  const refreshUser = async () => {
    await fetchSession();
  };

  const login = (userData: StaffData) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("user", JSON.stringify(userData));
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const logoutResponse = await fetch("/api/auth/logout", { method: "POST" });
      if (logoutResponse.ok) {
        // completed successfully
      }
      setUser(null);
      if (typeof window !== "undefined") {
        clearAllLocalStorage();
      }
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
