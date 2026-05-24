"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Send, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";

interface AccessLockProps {
  message: string;
  userName: string;
  onSendRequest: () => void;
  onLogout: () => void;
}

export default function AccessLock({ message, userName, onSendRequest, onLogout }: AccessLockProps) {
  const [requestSent, setRequestSent] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "PENDING" | "APPROVED" | "DENIED">("IDLE");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Khôi phục trạng thái nếu đã gửi yêu cầu trước đó (khi đăng nhập lại)
  useEffect(() => {
    const localResponse = localStorage.getItem(`access_response_${userName}`);
    if (localResponse === "DENIED") {
      setStatus("DENIED");
      setRequestSent(true);
      return;
    }
    if (localResponse === "APPROVED") {
      setStatus("APPROVED");
      setRequestSent(true);
      return;
    }
    
    // Kiểm tra xem có đang nằm trong danh sách pending không
    const pendingReqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
    if (pendingReqs.some((req: any) => req.staffName === userName)) {
      setStatus("PENDING");
      setRequestSent(true);
    }
  }, [userName]);

  // Kiểm tra phản hồi từ quản lý - kéo từ cả localStorage lẫn server
  useEffect(() => {
    if (!requestSent) return;

    const checkApproval = async () => {
      // 1. Kiểm tra localStorage (cùng tab hoặc đã được sync về)
      const localResponse = localStorage.getItem(`access_response_${userName}`);
      if (localResponse === "APPROVED") {
        setStatus("APPROVED");
        return true;
      } else if (localResponse === "DENIED") {
        setStatus("DENIED");
        return true;
      }

      // 2. Nếu chưa có trong localStorage, fetch thẳng từ server (cho tab ẩn danh)
      try {
        const res = await fetch("/api/sync");
        if (res.ok) {
          const serverStore = await res.json();
          const serverResponse = serverStore[`access_response_${userName}`];
          if (serverResponse === "APPROVED") {
            localStorage.setItem(`access_response_${userName}`, "APPROVED");
            setStatus("APPROVED");
            return true;
          } else if (serverResponse === "DENIED") {
            localStorage.setItem(`access_response_${userName}`, "DENIED");
            setStatus("DENIED");
            return true;
          }
        }
      } catch (err) {
        console.error("AccessLock server check error:", err);
      }
      return false;
    };

    const checkInterval = setInterval(async () => {
      const done = await checkApproval();
      if (done) clearInterval(checkInterval);
    }, 1000);

    // Kiểm tra ngay lập tức
    checkApproval();

    return () => clearInterval(checkInterval);
  }, [requestSent, userName]);

  const handleSend = () => {
    // Xóa phản hồi cũ nếu có
    localStorage.removeItem(`access_response_${userName}`);
    onSendRequest();
    setRequestSent(true);
    setStatus("PENDING");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white dark:bg-sidebar border border-gold/20 rounded-[50px] p-12 text-center relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
        
        <div className="mx-auto w-24 h-24 bg-gold/10 rounded-[30px] flex items-center justify-center text-gold mb-8 border border-gold/20">
          <Lock size={48} />
        </div>

        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 uppercase">Hệ thống đã khóa</h1>
        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl py-4 px-8 mb-8 inline-flex items-center gap-4">
           <Clock className="text-gold" size={24} />
           <span className="text-2xl font-mono font-black text-gray-900 dark:text-white">
             {currentTime.toLocaleTimeString('vi-VN')}
           </span>
        </div>

        <p className="text-xl text-gray-600 dark:text-gray-400 font-medium mb-10 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {status === "IDLE" && (
            <button 
              onClick={handleSend}
              className="h-16 px-10 rounded-2xl bg-gold text-[#0a0a0a] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-gold/20"
            >
              <Send size={24} /> Gửi yêu cầu truy cập
            </button>
          )}

          {status === "PENDING" && (
            <div className="h-16 px-10 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gold/50 text-gold font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse">
              <ShieldAlert size={24} /> Đang chờ phê duyệt...
            </div>
          )}

          {status === "APPROVED" && (
            <div className="h-16 px-10 rounded-2xl bg-green-500 text-gray-900 dark:text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-500/20">
              <CheckCircle2 size={24} /> Đã được đồng ý!
            </div>
          )}

          {status === "DENIED" && (
            <div className="flex flex-col gap-4">
              <div className="h-16 px-10 rounded-2xl bg-red-500/10 border border-red-500 text-red-500 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                <ShieldAlert size={24} /> Yêu cầu đăng nhập đã bị từ chối
              </div>
              <button 
                onClick={() => setStatus("IDLE")}
                className="text-gold text-base font-bold hover:underline"
              >
                Thử gửi lại yêu cầu
              </button>
            </div>
          )}

          <button 
            onClick={onLogout}
            className="h-16 px-10 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
          >
            <LogOut size={24} /> Đăng xuất
          </button>
        </div>

        <p className="mt-12 text-sm font-bold text-gray-600 uppercase tracking-widest">AQ MEDIA Management System &copy; 2026</p>
      </motion.div>
    </div>
  );
}
