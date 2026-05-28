"use client";

import React, { useState, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { X, Mail, Phone, MapPin, ShieldCheck, Save, AlertCircle, Camera, Calendar, User, Clock } from"lucide-react";
import { clsx, type ClassValue } from"clsx";
import { twMerge } from"tailwind-merge";

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
 offWorkTime?: string;
 };
}

const ProfileModal = ({ isOpen, onClose, userData }: ProfileModalProps) => {
 const [formData, setFormData] = useState(userData);
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [isSaving, setIsSaving] = useState(false);
 const [currentPassword, setCurrentPassword] = useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, avatar: data.url }));
      } else {
        const errData = await res.json();
        alert(errData.error || "Lỗi tải ảnh lên");
      }
    } catch (err) {
      console.error("Lỗi upload file:", err);
      alert("Đã xảy ra lỗi hệ thống khi tải ảnh.");
    } finally {
      setIsUploading(false);
    }
  };
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [passwordError, setPasswordError] = useState("");
 const [passwordSuccess, setPasswordSuccess] = useState("");

 useEffect(() => {
 if (isOpen) {
 setFormData(userData);
 setErrors({});
 }
 }, [isOpen, userData]);

 const validate = () => {
 const newErrors: Record<string, string> = {};
 if (!formData.name.trim()) newErrors.name ="Họ và tên không được để trống";
 if (!formData.email) {
 newErrors.email ="Email không được để trống";
 } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
 newErrors.email ="Email không đúng định dạng";
 }
 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSave = async () => {
 if (!validate()) return;
 
 setIsSaving(true);
 try {
 const res = await fetch(`/api/users/${formData.id}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(formData)
 });

 if (res.ok) {
 const data = await res.json();
 // Cập nhật session 
 const updatedUserData = { ...formData, ...data.user };
 localStorage.setItem("user", JSON.stringify(updatedUserData));
 sessionStorage.setItem("user", JSON.stringify(updatedUserData));
 
 window.dispatchEvent(new Event("storage"));
 alert("Cập nhật thông tin thành công!");
 onClose();
 } else {
 const errorData = await res.json();
 alert(errorData.error ||"Lỗi khi cập nhật thông tin");
 }
 } catch (err) {
 console.error("Profile sync error:", err);
 alert("Đã xảy ra lỗi hệ thống khi lưu.");
 } finally {
 setIsSaving(false);
 }
 };

 const getRoleLabel = (role?: string) => {
 if (role ==="01") return"01 - ADMIN";
 if (role ==="02") return"02 - QUẢN LÝ CÔNG VIỆC";
 if (role ==="03") return"03 - QUẢN LÝ NHÂN SỰ";
 if (role ==="04") return"04 - NHÂN VIÊN CHÍNH THỨC";
 if (role ==="05") return"05 - NHÂN VIÊN THỬ VIỆC";
 return"CHƯA CẤP QUYỀN";
 };

 const handlePasswordChange = async () => {
 setPasswordError("");
 setPasswordSuccess("");
 if (!currentPassword || !newPassword || !confirmPassword) {
 setPasswordError("Vui lòng nhập đầy đủ thông tin");
 return;
 }
 if (newPassword !== confirmPassword) {
 setPasswordError("Mật khẩu mới không khớp");
 return;
 }
 if ((newPassword || []).length < 6) {
 setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự");
 return;
 }

 try {
 const res = await fetch(`/api/users/${formData.id}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ password: newPassword, currentPassword })
 });

 if (res.ok) {
 setPasswordSuccess("Đổi mật khẩu thành công!");
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 } else {
 const errorData = await res.json();
 setPasswordError(errorData.error ||"Mật khẩu hiện tại không đúng hoặc lỗi hệ thống");
 }
 } catch (err) {
 setPasswordError("Lỗi kết nối đến máy chủ");
 }
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/0 bg-gray-900 shadow-xl"
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-white/0 bg-white/0 px-8 py-6">
 <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
 <span className="h-6 w-1.5 rounded-full bg-gold shadow-[0_0_10px_#d4af37]" />
 Hồ sơ cá nhân
 </h2>
 <button onClick={onClose} className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-zinc-800/50 bg-zinc-900/5 hover:text-white">
 <X size={24} />
 </button>
 </div>

 {/* Body */}
 <div className="space-y-8 p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
 <div className="flex flex-col items-center">
 <div className="relative w-24 h-24 mb-4 group cursor-pointer" onClick={handleAvatarClick}>
 <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-4xl font-bold rounded-full shadow-lg overflow-hidden border-2 border-gold/20 relative">
 {formData.avatar ? (
 <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 formData.name.charAt(0).toUpperCase()
 )}
 {isUploading && (
   <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-bold">
     Uploading...
   </div>
 )}
 </div>
 <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-gold hover:bg-gold/90 border border-gray-900 flex items-center justify-center text-sidebar transition-all shadow-md group-hover:scale-110">
   <Camera size={14} />
 </div>
 <input 
   type="file" 
   ref={fileInputRef} 
   onChange={handleFileChange} 
   accept="image/*" 
   className="hidden" 
 />
 </div>
 <div className="mt-4 text-center">
 <p className="text-lg font-black text-white uppercase tracking-tighter">{formData.name}</p>
 <p className="text-sm font-bold text-gold uppercase tracking-[0.3em] mt-1">@{formData.username}</p>
 </div>
 <div className="w-full mt-4 max-w-xs">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
 <Clock size={14} className="text-gold" /> Giờ tan làm
 </label>
 <input
 type="time" value={formData.offWorkTime ||"17:30"}
 onChange={(e) => setFormData({...formData, offWorkTime: e.target.value})}
 className="h-12 w-full rounded-2xl border bg-gray-800 text-white border-gray-600 px-4 text-base focus:outline-none focus:border-white/5 transition-all shadow-inner"
 />
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
 className="h-12 w-full rounded-2xl border bg-gray-800 text-white border-gray-600 px-4 text-base text-white focus:outline-none focus:border-white/5 transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 <Calendar size={14} className="text-gold" /> Năm sinh
 </label>
 <input
 type="text" value={formData.birthYear ||""}
 onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
 className="h-12 w-full rounded-2xl border bg-gray-800 text-white border-gray-600 px-4 text-base text-white focus:outline-none focus:border-white/5 transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 <Mail size={14} className="text-gold" /> Email
 </label>
 <input
 type="email" value={formData.email}
 onChange={(e) => setFormData({...formData, email: e.target.value})}
 className="h-12 w-full rounded-2xl border bg-gray-800 text-white border-gray-600 px-4 text-base text-white focus:outline-none focus:border-white/5 transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 <Phone size={14} className="text-gold" /> Số điện thoại
 </label>
 <input
 type="text" value={formData.phone ||""}
 onChange={(e) => setFormData({...formData, phone: e.target.value})}
 className="h-12 w-full rounded-2xl border bg-gray-800 text-white border-gray-600 px-4 text-base text-white focus:outline-none focus:border-white/5 transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2 md:col-span-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 <MapPin size={14} className="text-gold" /> Địa chỉ liên hệ
 </label>
 <input
 type="text" value={formData.address ||""}
 onChange={(e) => setFormData({...formData, address: e.target.value})}
 className="h-12 w-full rounded-2xl border bg-gray-800 text-white border-gray-600 px-4 text-base text-white focus:outline-none focus:border-white/5 transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2 md:col-span-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
 <ShieldCheck size={14} className="text-gold" /> Chức vụ hệ thống
 </label>
 <div className="flex h-12 w-full items-center rounded-2xl border border-white/0 bg-white/0 px-4 text-base font-black text-gray-500 text-gray-400 uppercase tracking-wider">
 {getRoleLabel(userData.role)}
 </div>
 </div>
 </div>

 </div>

 {/* Footer */}
 <div className="flex items-center justify-end gap-4 border-t border-white/0 bg-zinc-950/20 px-8 py-6">
 <button onClick={onClose} className="px-8 py-3 text-sm font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors rounded-xl border border-gray-600">Hủy bỏ</button>
 <button 
 onClick={handleSave} disabled={isSaving}
 className="flex items-center gap-2 rounded-xl bg-gold px-8 py-3 text-sm font-black text-sidebar transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-50 shadow-lg shadow-gold/20 uppercase tracking-widest"
 >
 {isSaving ?"Đang lưu..." : <><Save size={18} /> Lưu thay đổi</>}
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 );
};

export default ProfileModal;
