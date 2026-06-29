"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, MapPin, ShieldCheck, Save, Calendar, User, Clock } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { StaffData } from "@/types/admin";

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

interface ProfileModalProps {
 isOpen: boolean;
 onClose: () => void;
 userData: StaffData;
}

const ProfileModal = ({ isOpen, onClose, userData }: ProfileModalProps) => {
 const [formData, setFormData] = useState(userData);
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [isSaving, setIsSaving] = useState(false);
 const [currentPassword, setCurrentPassword] = useState("");

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

 const isManagement = formData.role === "01" || formData.role === "02";

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
 try {
 const res = await fetch(`/api/admin/users/${formData.id}`, {
 method: "PUT",
 headers: { "Content-Type": "application/json" },
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
 window.location.reload();
 } else {
 const errorData = await res.json();
 alert(errorData.error || "Lỗi khi cập nhật thông tin");
 }
 } catch (err) {
 console.error("Profile sync error:", err);
 alert("Đã xảy ra lỗi hệ thống khi lưu.");
 } finally {
 setIsSaving(false);
 }
 };

 const getRoleLabel = (role?: string) => {
 if (role === "01") return "01 - ADMIN";
 if (role === "02") return "02 - QUẢN LÝ CÔNG VIỆC";
 if (role === "03") return "03 - QUẢN LÝ NHÂN SỰ";
 if (role === "04") return "04 - NHÂN VIÊN CHÍNH THỨC";
 if (role === "05") return "05 - NHÂN VIÊN THỬ VIỆC";
 return "CHƯA CẤP QUYỀN";
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
 const res = await fetch(`/api/admin/users/${formData.id}`, {
 method: "PUT",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ password: newPassword, currentPassword })
 });

 if (res.ok) {
 setPasswordSuccess("Đổi mật khẩu thành công!");
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 window.location.reload();
 } else {
 const errorData = await res.json();
 setPasswordError(errorData.error || "Mật khẩu hiện tại không đúng hoặc lỗi hệ thống");
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
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background-secondary shadow-premium"
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-border bg-background-secondary/50 px-8 py-6">
 <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
 <span className="h-6 w-1.5 rounded-full bg-gold shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
 Hồ sơ cá nhân
 </h2>
 <button onClick={onClose} className="rounded-lg p-2 text-foreground-secondary transition-colors hover:bg-background-tertiary hover:text-white">
 <X size={24} />
 </button>
 </div>

 {/* Body */}
 <div className="space-y-8 p-8 overflow-y-auto max-h-[70vh] custom-scrollbar bg-background-secondary">
 <div className="flex flex-col items-center">
 <div className="relative w-24 h-24 mb-4">
 <div className="w-full h-full bg-background-tertiary text-gold flex items-center justify-center text-4xl font-bold rounded-full shadow-lg overflow-hidden border-2 border-gold/20 relative">
 {formData.avatar ? (
 <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 (formData.name || formData.username || "U").charAt(0).toUpperCase()
 )}
 </div>
 </div>
 <div className="mt-4 text-center">
 <p className="text-lg font-black text-white uppercase tracking-tighter">{formData.name}</p>
 <p className="text-sm font-bold text-gold uppercase tracking-[0.3em] mt-1">@{formData.username}</p>
 </div>
 <div className="w-full mt-4 max-w-xs">
 <label className="text-[10px] font-black uppercase tracking-widest text-foreground-secondary flex items-center gap-2 mb-2">
 <Clock size={14} className="text-gold" /> Giờ tan làm
 </label>
 <input
 type="time" value={formData.offWorkTime || "17:30"}
 disabled={!isManagement}
 onChange={(e) => setFormData({...formData, offWorkTime: e.target.value})}
 className="h-12 w-full rounded-lg border bg-background text-white border-border px-4 text-base focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
 />
 { !isManagement && <p className="text-[9px] text-zinc-500 italic mt-1 ml-1">* Chỉ quản lý mới có quyền thay đổi giờ tan làm</p> }
 </div>
 </div>

 <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">
 <User size={14} className="text-gold" /> Họ và tên
 </label>
 <input
 type="text" value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 className="h-12 w-full rounded-lg border bg-background text-white border-border px-4 text-base text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">
 <Calendar size={14} className="text-gold" /> Năm sinh
 </label>
 <input
 type="text" value={formData.birthYear || ""}
 onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
 className="h-12 w-full rounded-lg border bg-background text-white border-border px-4 text-base text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">
 <Mail size={14} className="text-gold" /> Email
 </label>
 <input
 type="email" value={formData.email}
 onChange={(e) => setFormData({...formData, email: e.target.value})}
 className="h-12 w-full rounded-lg border bg-background text-white border-border px-4 text-base text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">
 <Phone size={14} className="text-gold" /> Số điện thoại
 </label>
 <input
 type="text" value={formData.phone || ""}
 onChange={(e) => setFormData({...formData, phone: e.target.value})}
 className="h-12 w-full rounded-lg border bg-background text-white border-border px-4 text-base text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2 md:col-span-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">
 <MapPin size={14} className="text-gold" /> Địa chỉ liên hệ
 </label>
 <input
 type="text" value={formData.address || ""}
 onChange={(e) => setFormData({...formData, address: e.target.value})}
 className="h-12 w-full rounded-lg border bg-background text-white border-border px-4 text-base text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-inner"
 />
 </div>

 <div className="space-y-2 md:col-span-2">
 <label className="flex items-center gap-2 text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">
 <ShieldCheck size={14} className="text-gold" /> Chức vụ hệ thống
 </label>
 <div className="flex h-12 w-full items-center rounded-lg border border-border bg-background px-4 text-base font-black text-foreground-secondary uppercase tracking-wider">
 {getRoleLabel(userData.role)}
 </div>
 </div>
 </div>

 </div>

 {/* Footer */}
 <div className="flex items-center justify-end gap-4 border-t border-border bg-background-secondary/80 px-8 py-6">
 <button onClick={onClose} className="px-8 py-3 text-sm font-black text-foreground-secondary uppercase tracking-widest hover:text-white transition-colors rounded-lg border border-border">Hủy bỏ</button>
 <button
 onClick={handleSave}
 disabled={isSaving}
 className="flex items-center gap-2 rounded-lg bg-gold px-8 py-3 text-sm font-black text-sidebar transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-50 shadow-lg shadow-gold/20 uppercase tracking-widest"
 >
 {isSaving ? (
 <>
 <div className="w-4 h-4 border-2 border-sidebar/30 border-t-sidebar rounded-full animate-spin" />
 Đang lưu...
 </>
 ) : (
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
