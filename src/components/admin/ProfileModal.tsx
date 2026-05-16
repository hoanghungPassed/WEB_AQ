"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, MapPin, ShieldCheck, Save, AlertCircle, Camera, Upload } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    avatar?: string;
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
    
    // Email validate
    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không đúng định dạng";
    }

    // Phone validate
    if (!formData.phone) {
      newErrors.phone = "Số điện thoại không được để trống";
    } else if (!/^\d{10,11}$/.test(formData.phone)) {
      newErrors.phone = "SĐT phải từ 10-11 chữ số";
    }

    // Address validate
    if (!formData.address.trim()) {
      newErrors.address = "Địa chỉ không được để trống";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    // Giả lập lưu dữ liệu
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert("Cập nhật thông tin thành công!");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border-custom bg-sidebar shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-custom bg-header/50 px-8 py-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-gold" />
                Thông tin cá nhân
              </h2>
              <button 
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-8 p-8 overflow-y-auto max-h-[70vh]">
              {/* Avatar Upload Area */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-3xl border-4 border-gold/20 bg-gold/5 flex items-center justify-center overflow-hidden shadow-2xl transition-all group-hover:border-gold">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl font-black text-gold">{formData.name.charAt(0)}</span>
                    )}
                  </div>
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden" 
                    accept="image/*"
                  />
                  
                  {/* Overlay Upload Button */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-sidebar shadow-lg transition-transform hover:scale-110 active:scale-95"
                  >
                    <Camera size={20} />
                  </button>
                </div>
                <p className="mt-4 text-sm font-bold text-white uppercase tracking-widest">{formData.name}</p>
                <span className="mt-1 inline-block rounded-full bg-gold/10 px-4 py-1 text-[10px] font-black text-gold uppercase tracking-[0.2em]">
                  {formData.role}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                    <Mail size={16} className="text-gold" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={cn(
                      "h-12 w-full rounded-xl border bg-background/50 px-4 text-sm text-white transition-all focus:outline-none focus:ring-4",
                      errors.email ? "border-red-500/50 focus:ring-red-500/10" : "border-border-custom focus:border-gold focus:ring-gold/10"
                    )}
                  />
                  {errors.email && (
                    <p className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      <AlertCircle size={12} /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                    <Phone size={16} className="text-gold" />
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={cn(
                      "h-12 w-full rounded-xl border bg-background/50 px-4 text-sm text-white transition-all focus:outline-none focus:ring-4",
                      errors.phone ? "border-red-500/50 focus:ring-red-500/10" : "border-border-custom focus:border-gold focus:ring-gold/10"
                    )}
                  />
                  {errors.phone && (
                    <p className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      <AlertCircle size={12} /> {errors.phone}
                    </p>
                  )}
                </div>

                {/* Address Field */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                    <MapPin size={16} className="text-gold" />
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className={cn(
                      "h-12 w-full rounded-xl border bg-background/50 px-4 text-sm text-white transition-all focus:outline-none focus:ring-4",
                      errors.address ? "border-red-500/50 focus:ring-red-500/10" : "border-border-custom focus:border-gold focus:ring-gold/10"
                    )}
                  />
                  {errors.address && (
                    <p className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      <AlertCircle size={12} /> {errors.address}
                    </p>
                  )}
                </div>

                {/* Role Field (Readonly) */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                    <ShieldCheck size={16} className="text-gold" />
                    Chức vụ hệ thống
                  </label>
                  <div className="flex h-12 w-full items-center rounded-xl border border-border-custom bg-white/5 px-4 text-sm text-gray-400">
                    {formData.role}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-border-custom bg-header/30 px-8 py-6">
              <button 
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-gold px-8 py-3 text-sm font-bold text-sidebar transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-50"
              >
                {isSaving ? "Đang lưu..." : (
                  <>
                    <Save size={18} />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
