"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Send, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";

interface AccessLockProps {
  message: string;
  userName: string;
  onSendRequest: () => void;
  onLogout: () => void;
  isPendingApproval?: boolean;
}

export default function AccessLock({
  message,
  userName,
  onSendRequest,
  onLogout,
  isPendingApproval = false,
}: AccessLockProps) {
  const [requestSent, setRequestSent] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "GRANTED" | "REJECTED">("IDLE");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!requestSent && !isPendingApproval) return;
    
    if (isPendingApproval && status === "IDLE") {
      setStatus("PROCESSING");
    }

    const checkApproval = async () => {
      try {
        const res = await fetch(`/api/auth/check-status?username=${userName}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "GRANTED") {
            setStatus("GRANTED");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return true;
          } else if (data.status === "REJECTED") {
            setStatus("REJECTED");
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
    }, 3000);

    checkApproval();

    return () => clearInterval(checkInterval);
  }, [requestSent, userName, isPendingApproval, status]);

  const handleSend = () => {
    localStorage.removeItem(`access_response_${userName}`);
    onSendRequest();
    setRequestSent(true);
    setStatus("PROCESSING");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-sidebar/85 backdrop-blur-lg border border-gold/20 rounded-[32px] p-12 text-center relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] shadow-gold/5"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

        <div className="mx-auto w-24 h-24 bg-gold/10 rounded-[30px] flex items-center justify-center text-gold mb-8 border border-gold/20">
          <Lock size={48} />
        </div>

        <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">
          Hệ thống đã khóa
        </h1>
        <div className="bg-white/5 border border-white/0 rounded-2xl py-4 px-8 mb-8 inline-flex items-center gap-4">
          <Clock className="text-gold" size={24} />
          <span className="text-2xl font-mono font-black text-white">
            {currentTime.toLocaleTimeString("vi-VN")}
          </span>
        </div>

        <p className="text-xl text-gray-400 font-medium mb-10 leading-relaxed">
          {message}
        </p>

        {isPendingApproval || status === "PROCESSING" ? (
          <div className="flex flex-col gap-6 items-center">
            <div className="h-16 px-10 rounded-2xl bg-gold/10 border border-gold/20 text-gold font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse">
              ⌛ Hệ thống đang xử lý... Vui lòng chờ
            </div>
            <button
              onClick={onLogout}
              className="h-16 px-10 rounded-2xl bg-white/5 border border-white/0 text-gray-400 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
            >
              <LogOut size={24} /> Đăng xuất
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 items-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              {status === "IDLE" && (
                <button
                  onClick={handleSend}
                  className="h-16 px-10 rounded-2xl bg-gold text-[#0a0a0a] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-gold/20"
                >
                  <Send size={24} /> Gửi yêu cầu truy cập
                </button>
              )}

              {status === "GRANTED" && (
                <div className="h-16 px-10 rounded-2xl bg-green-500/10 border border-green-500/50 text-green-500 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                  <CheckCircle2 size={24} /> Đã được đồng ý!
                </div>
              )}

              {status === "REJECTED" && (
                <div className="h-16 px-10 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-500 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                  <ShieldAlert size={24} /> Yêu cầu bị từ chối
                </div>
              )}

              <button
                onClick={onLogout}
                className="h-16 px-10 rounded-2xl bg-white/5 border border-white/0 text-gray-400 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
              >
                <LogOut size={24} /> Đăng xuất
              </button>
            </div>
            
            {status === "REJECTED" && (
              <button
                onClick={() => setStatus("IDLE")}
                className="text-gold text-base font-bold hover:underline"
              >
                Thử gửi lại yêu cầu
              </button>
            )}
          </div>
        )}

        <p className="mt-12 text-sm font-bold uppercase tracking-widest text-gray-500">
          AQ MEDIA Management System &copy; 2026
        </p>
      </motion.div>
    </div>
  );
}
