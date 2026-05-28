"use client";

import React, { createContext, useContext, useEffect, useState } from"react";
import { useRouter, usePathname } from"next/navigation";
import { StaffData } from"@/types/admin";
import { mutate } from "swr";

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
 if (typeof window !=="undefined") {
 sessionStorage.setItem("user", JSON.stringify(data.user));
 localStorage.setItem("user", JSON.stringify(data.user));
 }
 } else {
 setUser(null);
 if (typeof window !=="undefined") {
 sessionStorage.removeItem("user");
 localStorage.removeItem("user");
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
 }, [pathname]); // Refresh session checking dynamically based on navigation could be useful, or just on mount

 // Lắng nghe hoạt động để liên tục cập nhật lastActive lên server
 useEffect(() => {
 if (!user) return;
 let lastUpdate = Date.now();
 const handleActivity = () => {
 // Throttle 2 phút (120 giây) để tránh spam API
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

 const refreshUser = async () => {
 await fetchSession();
 };

 const login = (userData: StaffData) => {
 setUser(userData);
 if (typeof window !=="undefined") {
 sessionStorage.setItem("user", JSON.stringify(userData));
 localStorage.setItem("user", JSON.stringify(userData));
 }
 };

 const logout = async () => {
 try {
 setLoading(true);
 // Ensure the fetch is fully awaited and completed first
 const logoutResponse = await fetch("/api/auth/logout", { method: "POST" });
 if (logoutResponse.ok) {
   // completed successfully
 }
 setUser(null);
 if (typeof window !=="undefined") {
 sessionStorage.removeItem("user");
 localStorage.removeItem("user");
 }
 // Flush browser SWR cache next
 mutate(() => true, undefined, { revalidate: false });
 // Finally navigate to login
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
