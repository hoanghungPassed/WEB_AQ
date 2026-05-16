"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, MapPin, ShieldCheck, Save, AlertCircle, Camera, Calendar, User } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    id: string;
    name: string;
    username: string;
    email: string;
    phone?: string;
    address?: string;
    role?: string;
    avatar?: string;
    birthYear?: string;
  };
}

const ProfileModal = ({ isOpen, onClose, userData }: ProfileModalProps) => {
  const [formData, setFormData] = useState(userData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userData.avatar || null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(userData);
      setAvatarPreview(userData.avatar || null);
      setErrors({});
    }
  }, [isOpen, userData]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Họ và tên không được để trống";
    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không đúng định dạng";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    // Lưu vào localStorage Mock DB
    const allUsers = JSON.parse(localStorage.getItem("global_users") || "[]");
    const updatedUsers = allUsers.map((u: any) => 
      u.id === formData.id ? { ...u, ...formData, avatar: avatarPreview } : u
    );
    localStorage.setItem("global_users", JSON.stringify(updatedUsers));
    
    // Cập nhật session
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (currentUser.id === formData.id) {
      localStorage.setItem("user", JSON.stringify({ ...currentUser, ...formData, avatar: avatarPreview }));
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    alert("Cập nhật thông tin thành công! Vui lòng tải lại trang để thấy thay đổi.");
    onClose();
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "01 - ADMIN";
    if (role === "02") return "02 - QUẢN LÝ CÔNG VIỆC";
    if (role === "03") return "03 - QUẢN LÝ NHÂN SỰ";
    if (role === "04") return "04 - NHÂN VIÊN";
    return "CHƯA CẤP QUYỀN";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[40px] border border-white/10 bg-sidebar shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-8 py-6">
              <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                <span className="h-6 w-1.5 rounded-full bg-gold shadow-[0_0_10px_#d4af37]" />
                Hồ sơ cá nhân
              </h2>
              <button onClick={onClose} className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-8 p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="h-28 w-28 rounded-[32px] border-4 border-gold/10 bg-gold/5 flex items-center justify-center overflow-hidden shadow-2xl transition-all group-hover:border-gold/30">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl font-black text-gold">{formData.name.charAt(0)}</span>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                  <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-sidebar shadow-lg transition-transform hover:scale-110">
                    <Camera size={18} />
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-lg font-black text-white uppercase tracking-tighter">{formData.name}</p>
                  <p className="text-xs font-bold text-gold uppercase tracking-[0.3em] mt-1">@{formData.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <User size={14} className="text-gold" /> Họ và tên
                  </label>
                  <input
                    type="text" value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-12 w-full rounded-2xl border border-white/5 bg-black/20 px-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Calendar size={14} className="text-gold" /> Năm sinh
                  </label>
                  <input
                    type="text" value={formData.birthYear || ""}
                    onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                    className="h-12 w-full rounded-2xl border border-white/5 bg-black/20 px-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Mail size={14} className="text-gold" /> Email
                  </label>
                  <input
                    type="email" value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="h-12 w-full rounded-2xl border border-white/5 bg-black/20 px-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Phone size={14} className="text-gold" /> Số điện thoại
                  </label>
                  <input
                    type="text" value={formData.phone || ""}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="h-12 w-full rounded-2xl border border-white/5 bg-black/20 px-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <MapPin size={14} className="text-gold" /> Địa chỉ liên hệ
                  </label>
                  <input
                    type="text" value={formData.address || ""}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="h-12 w-full rounded-2xl border border-white/5 bg-black/20 px-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <ShieldCheck size={14} className="text-gold" /> Chức vụ hệ thống
                  </label>
                  <div className="flex h-12 w-full items-center rounded-2xl border border-white/5 bg-white/[0.02] px-4 text-sm font-black text-gray-400 uppercase tracking-wider">
                    {getRoleLabel(formData.role)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-white/5 bg-white/[0.01] px-8 py-6">
              <button onClick={onClose} className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Hủy bỏ</button>
              <button 
                onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-gold px-8 py-3 text-xs font-black text-sidebar transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-50 shadow-lg shadow-gold/20 uppercase tracking-widest"
              >
                {isSaving ? "Đang lưu..." : <><Save size={18} /> Lưu thay đổi</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
