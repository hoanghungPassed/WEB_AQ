"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function HeaderClock() {
  const [dateTimeStr, setDateTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      
      const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const dayName = days[now.getDay()];
      
      setDateTimeStr(`${dayName}, ${day}/${month}/${year} - ${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-xl shadow-inner group transition-all hover:bg-white/10">
      <Clock className="text-gold animate-pulse" size={16} />
      <span className="text-[10px] font-black text-white/70 uppercase tracking-widest font-mono group-hover:text-white transition-colors">
        {dateTimeStr}
      </span>
    </div>
  );
}
