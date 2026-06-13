"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Loader2, ArrowLeft, Phone, Calendar, MapPin, AlertCircle, CheckCircle2, Clock, Mail } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Pusher from "pusher-js";
import toast from "react-hot-toast";

export default function RegisterPage() {
 const router = useRouter();
 const { login } = useAuth();
 const [isClient, setIsClient] = useState(false);
 const [formData, setFormData] = useState({
 name: "",
 birthYear: "",
 username: "",
 phone: "",
 email: "",
 address: "",
 password: "",
 confirmPassword: ""
 });
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [isLoading, setIsLoading] = useState(false);
 const [isWaitingApproval, setIsWaitingApproval] = useState(false);
 const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
 const [isUsernameDuplicate, setIsUsernameDuplicate] = useState(false);
 const [agreeTerms, setAgreeTerms] = useState(false);
 const [rulesUrl, setRulesUrl] = useState("");
 const [showOtpMethodModal, setShowOtpMethodModal] = useState(false);
 const [otpMethod, setOtpMethod] = useState<"EMAIL" | "PHONE" | null>(null);
 const [showOtpModal, setShowOtpModal] = useState(false);
 const [otpCode, setOtpCode] = useState("");
 const [otpError, setOtpError] = useState("");
 const [demoOtp, setDemoOtp] = useState("");

 useEffect(() => {
   fetch("/api/admin/settings")
     .then(res => res.json())
     .then(data => {
       if (data.success && data.data?.rulesUrl) {
         setRulesUrl(data.data.rulesUrl);
       }
     })
     .catch(err => console.error("Failed to fetch settings:", err));
 }, []);

 useEffect(() => {
   // eslint-disable-next-line react-hooks/set-state-in-effect
   setIsClient(true);
 }, []);

 const years = Array.from({ length: 2010 - 1970 + 1 }, (_, i) => (2010 - i).toString());

 const passwordStrength = useMemo(() => {
 const pass = formData.password;
 if (!pass) return { score: 0, label:"", color:"" };
 let score = 0;
 if ((pass || []).length >= 6) score += 1;
 if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;
 if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
 if (score === 1) return { score: 1, label:"Yếu", color:"bg-red-500" };
 if (score === 2) return { score: 2, label:"Trung bình", color:"bg-yellow-500" };
 if (score >= 3) return { score: 3, label:"Mạnh", color:"bg-green-500" };
 return { score: 0, label:"Quá yếu", color:"bg-red-500/50" };
 }, [formData.password]);

 const validateField = (name: string, value: string) => {
 let error ="";
 if (name ==="phone") {
 const phoneRegex = /^(0|84)(3|5|7|8|9)([0-9]{8})$/;
 if (!phoneRegex.test(value)) error ="Số điện thoại không hợp lệ";
 }
 if (name === "email") {
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(value)) error = "Email không hợp lệ";
 }
 if (name ==="password") {
 if ((value || []).length < 6) error ="Tối thiểu 6 ký tự";
 else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) error ="Cần 1 ký tự đặc biệt";
 }
 if (name ==="confirmPassword") {
 if (value !== formData.password) error ="Mật khẩu không khớp";
 }
 if (name ==="username" && (value || []).length < 3) error ="Tối thiểu 3 ký tự";
 if (!value) error ="Không được để trống";
 setErrors(prev => ({ ...prev, [name]: error }));
 return !error;
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
 const { name, value } = e.target;
 if (name === "username") {
    setIsUsernameDuplicate(false);
    setErrors(prev => {
      const next = { ...prev };
      if (next.username === "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác") {
        delete next.username;
      }
      return next;
    });
 }
 if (name ==="phone") {
 const numericValue = value.replace(/[^0-9]/g,"");
 setFormData(prev => ({ ...prev, [name]: numericValue }));
 validateField(name, numericValue);
 return;
 }
 setFormData(prev => ({ ...prev, [name]: value }));
 validateField(name, value);
 };

 const handleUsernameBlur = async () => {
    const username = formData.username.trim();
    if ((username || "").length < 3) return;

    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setErrors(prev => ({ ...prev, username: "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác" }));
          setIsUsernameDuplicate(true);
        } else {
          setIsUsernameDuplicate(false);
          setErrors(prev => {
            const next = { ...prev };
            if (next.username === "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác") {
              delete next.username;
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Lỗi kiểm tra username:", err);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.error("Bạn phải đồng ý với Nội quy và Điều khoản dịch vụ!");
      return;
    }
    
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      const val = (formData as any)[key];
      if (key ==="phone") {
        if (!/^(0|84)(3|5|7|8|9)([0-9]{8})$/.test(val)) newErrors[key] ="SĐT không hợp lệ";
      } else if (key === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) newErrors[key] = "Email không hợp lệ";
      } else if (key ==="password") {
        if ((val || []).length < 6 || !/[!@#$%^&*(),.?":{}|<>]/.test(val)) newErrors[key] ="Mật khẩu không đủ mạnh";
      } else if (key ==="confirmPassword") {
        if (val !== formData.password) newErrors[key] ="Mật khẩu không khớp";
      } else if (!val) {
        newErrors[key] ="Thông tin bắt buộc";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setShowOtpMethodModal(true);
  };

  const handleSelectOtpMethod = (method: "EMAIL" | "PHONE") => {
    setOtpMethod(method);
    setShowOtpMethodModal(false);

    // Generate random 6-digit OTP
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoOtp(generated);
    setOtpCode("");
    setOtpError("");
    setShowOtpModal(true);

    if (method === "EMAIL") {
      toast.success(`[MOCK EMAIL] Mã OTP gửi tới mail ${formData.email} là: ${generated}`, {
        duration: 15000,
        icon: '✉️'
      });
    } else {
      toast.success(`[MOCK SMS] Mã OTP gửi tới số ${formData.phone} là: ${generated}`, {
        duration: 15000,
        icon: '🔑'
      });
    }
  };

  const handleVerifyOtpAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== demoOtp) {
      setOtpError("Mã OTP không chính xác, vui lòng thử lại!");
      return;
    }

    setShowOtpModal(false);
    setIsLoading(true);

    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setErrors({ username: regData.error || "Đăng ký thất bại" });
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Register API call failed:", err);
      setErrors({ username: "Không thể kết nối máy chủ" });
      setIsLoading(false);
      return;
    }

    setIsWaitingApproval(true);
    setApprovalStatus("PENDING");
  };

  const handleDismissWaiting = () => {
    setIsWaitingApproval(false);
    setIsLoading(false);
    setApprovalStatus("PENDING");
  };

  // Ref to prevent double auto-login
  const isAutoLoginRunning = useRef(false);

  // Extracted auto-login logic (reused by both polling and Pusher)
  const performAutoLogin = useCallback(async () => {
    if (isAutoLoginRunning.current) return;
    isAutoLoginRunning.current = true;
    setApprovalStatus("APPROVED");
    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.toLowerCase(),
          password: formData.password
        })
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        login(loginData.user);
        setTimeout(() => {
          router.push("/admin");
        }, 2000);
      } else {
        setTimeout(() => {
          router.push("/login?message=approved");
        }, 2000);
      }
    } catch (loginErr) {
      console.error("Lỗi tự động đăng nhập:", loginErr);
      setTimeout(() => {
        router.push("/login?message=approved");
      }, 2000);
    }
  }, [formData.username, formData.password, login, router]);

  // Polling: Kiểm tra trạng thái phê duyệt mỗi 3s
  useEffect(() => {
    if (!isWaitingApproval || !formData.username) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/check-status?username=${encodeURIComponent(formData.username.toLowerCase())}`);
        if (!res.ok) {
          if (res.status === 404) {
            setApprovalStatus("REJECTED");
          }
          return;
        }
        const data = await res.json();
        if (data.status === "GRANTED" || data.status === "APPROVED" || data.status === "ACTIVE") {
          clearInterval(interval);
          performAutoLogin();
        } else if (data.status === "REJECTED") {
          setApprovalStatus("REJECTED");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Lỗi check status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isWaitingApproval, formData.username, performAutoLogin]);

  // Pusher: Nhận realtime phê duyệt từ admin (không phải chờ polling)
  useEffect(() => {
    if (!isWaitingApproval || !formData.username) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    const channel = pusher.subscribe(`user-${formData.username.toLowerCase()}`);
    channel.bind("status-update", (data: any) => {
      if (data.status === "ACTIVE" || data.status === "APPROVED") {
        performAutoLogin();
      } else if (data.status === "LOCKED" || data.status === "REJECTED") {
        setApprovalStatus("REJECTED");
      }
    });

    return () => {
      pusher.unsubscribe(`user-${formData.username.toLowerCase()}`);
      pusher.disconnect();
    };
  }, [isWaitingApproval, formData.username, performAutoLogin]);

 const inputClass = (name: string) => `h-14 w-full rounded-2xl border ${errors[name] ?"border-red-500 bg-red-50/50 bg-red-900/20" :" border-gray-600 bg-gray-800 text-white"} pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm placeholder-gray-400 placeholder-gray-500 font-bold`;
 const labelClass ="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block";

 if (!isClient) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={48} /></div>;

 return (
 <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f0f0f] font-sans p-4 py-20 text-white">
 <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-gold/5 blur-[120px]" />
 <div className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-gold/5 blur-[120px]" />

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 w-full max-w-2xl">
 <div className="rounded-[48px] border border-white/0 bg-[#161616] p-10 md:p-16 shadow-2xl">
 <div className="mb-12 text-center">
 <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gold/5 border border-gold/10 p-2 shadow-2xl">
 <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain" onError={(e) => e.currentTarget.src ="https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
 </div>
 <h1 className="text-4xl font-black tracking-tighter uppercase">Đăng ký tài khoản</h1>
 <p className="mt-3 text-xs font-bold text-gray-500 uppercase tracking-[0.4em]">Hệ thống AQ MEDIA</p>
 </div>

 {isWaitingApproval ? (
 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-6">
 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[32px] bg-gold/20 text-gold mb-6 border border-white/0 animate-pulse">
 <Clock size={40} />
 </div>
 <div className="space-y-2">
 <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Đăng ký thành công!</h2>
 <p className="text-gold font-bold text-lg">Vui lòng đợi hệ thống xác nhận tài khoản.</p>
 <p className="text-gray-500 text-sm italic font-medium">Thông báo đã được gửi tới Admin để phê duyệt.</p>
 </div>
 <p className="text-gray-400 text-[10px] uppercase tracking-widest font-black pt-4">Đang chuyển hướng về trang đăng nhập...</p>
 </motion.div>
 ) : (
 <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
 <div className="space-y-1">
 <label className={labelClass}>Họ và tên</label>
 <div className="relative group">
 <User className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.name ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Nguyễn Văn A" style={{ paddingLeft: "3.5rem" }} className={inputClass("name")} />
 </div>
 {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ml-1"><AlertCircle size={12} /> {errors.name}</p>}
 </div>

 <div className="space-y-1">
 <label className={labelClass}>Năm sinh</label>
 <div className="relative group">
 <Calendar className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.birthYear ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <select name="birthYear" required value={formData.birthYear} onChange={handleInputChange} style={{ paddingLeft: "3.5rem" }} className={`${inputClass("birthYear")} appearance-none cursor-pointer`}>
 <option value="" disabled>Chọn năm</option>
 {(years || []).map(y => <option key={y} value={y}>{y}</option>)}
 </select>
 </div>
 </div>

 <div className="space-y-1">
 <label className={labelClass}>Username</label>
 <div className="relative group">
 <User className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.username ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <input type="text" name="username" required value={formData.username} onChange={handleInputChange} onBlur={handleUsernameBlur} placeholder="username_01" style={{ paddingLeft: "3.5rem" }} className={inputClass("username")} />
 </div>
 {errors.username && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ml-1"><AlertCircle size={12} /> {errors.username}</p>}
 </div>

 <div className="space-y-1">
 <label className={labelClass}>Số điện thoại</label>
 <div className="relative group">
 <Phone className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.phone ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="09xxxxxxxx" style={{ paddingLeft: "3.5rem" }} className={inputClass("phone")} />
 </div>
 {errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ml-1"><AlertCircle size={12} /> {errors.phone}</p>}
 </div>

 <div className="space-y-1">
  <label className={labelClass}>Email</label>
  <div className="relative group">
  <Mail className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.email ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="example@mail.com" style={{ paddingLeft: "3.5rem" }} className={inputClass("email")} />
  </div>
  {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ml-1"><AlertCircle size={12} /> {errors.email}</p>}
  </div>

 <div className="space-y-1">
 <label className={labelClass}>Địa chỉ liên hệ</label>
 <div className="relative group">
 <MapPin className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.address ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="Hà Nội, Việt Nam" style={{ paddingLeft: "3.5rem" }} className={inputClass("address")} />
 </div>
 </div>

 <div className="space-y-1">
 <label className={labelClass}>Mật khẩu</label>
 <div className="relative group">
 <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors.password ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <input type="password" name="password" required value={formData.password} onChange={handleInputChange} style={{ paddingLeft: "3.5rem" }} className={inputClass("password")} />
 </div>
 {formData.password && (
 <div className="px-1 pt-2 space-y-1.5">
 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
 <span className="text-gray-500">Độ mạnh:</span>
 <span className={passwordStrength.label ==="Mạnh" ?"text-green-500" : passwordStrength.label ==="Trung bình" ?"text-yellow-500" :"text-red-500"}>{passwordStrength.label}</span>
 </div>
 <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
 <motion.div initial={{ width: 0 }} animate={{ width: `${(passwordStrength.score / 3) * 100}%` }} className={`h-full ${passwordStrength.color}`} />
 </div>
 </div>
 )}
 {errors.password && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ml-1"><AlertCircle size={12} /> {errors.password}</p>}
 </div>

 <div className="space-y-1">
 <label className={labelClass}>Xác nhận mật khẩu</label>
 <div className="relative group">
 <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 ${formData.confirmPassword && formData.confirmPassword !== formData.password ?"text-red-500" :" text-gray-400 group-focus-within:text-gold"} transition-colors`} size={18} />
 <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleInputChange} style={{ paddingLeft: "3.5rem" }} className={`h-14 w-full rounded-2xl border ${formData.confirmPassword && formData.confirmPassword !== formData.password ?"border-red-500 bg-red-50/50 bg-red-900/20 text-white" : formData.confirmPassword && formData.confirmPassword === formData.password ?"border-green-500 bg-green-50/50 bg-green-900/20 text-white" :" border-gray-600 bg-gray-800 text-white"} pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm placeholder-gray-400 placeholder-gray-500 font-bold`} />
 </div>
 {formData.confirmPassword && formData.confirmPassword !== formData.password && (
 <p className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1 ml-1"><AlertCircle size={14} /> Mật khẩu không khớp!</p>
 )}
 {formData.confirmPassword && formData.confirmPassword === formData.password && (
 <p className="text-sm text-green-500 font-medium flex items-center gap-1 mt-1 ml-1"><CheckCircle2 size={14} /> Mật khẩu hợp lệ</p>
 )}
 </div>

  {/* Terms & Conditions Checkbox */}
  <div className="md:col-span-2 flex items-start gap-3 mt-4">
    <input
      type="checkbox"
      id="agreeTerms"
      checked={agreeTerms}
      onChange={(e) => setAgreeTerms(e.target.checked)}
      className="mt-1 h-5 w-5 rounded border-gray-600 bg-gray-800 text-gold focus:ring-gold cursor-pointer"
    />
    <label htmlFor="agreeTerms" className="text-xs font-bold text-gray-400 select-none cursor-pointer leading-normal">
      Tôi đồng ý với{" "}
      {rulesUrl ? (
        <a href={rulesUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-black">
          Nội quy công ty
        </a>
      ) : (
        <span className="text-gray-500 italic">Nội quy công ty (chưa cấu hình)</span>
      )}{" "}
      và các Điều khoản dịch vụ của AQ Media.
    </label>
  </div>

 <button type="submit" disabled={isLoading || isUsernameDuplicate || !agreeTerms || (formData.password !== '' && formData.confirmPassword !== formData.password)} className="md:col-span-2 mt-8 h-16 w-full rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-sm transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-70 shadow-2xl shadow-gold/20 flex items-center justify-center gap-3">
 {isLoading ? (
 <div className="flex items-center gap-3">
 <Loader2 className="animate-spin" size={24} />
 <span>Đang gửi yêu cầu...</span>
 </div>
 ) :"Tạo tài khoản ngay"}
 </button>

 <div className="md:col-span-2 text-center mt-6">
 <Link href="/login" className="text-[10px] font-black text-gray-500 hover:text-gold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest">
 <ArrowLeft size={16} /> Quay lại đăng nhập
 </Link>
 </div>
 </form>
 )}
 </div>
 </motion.div>

  <AnimatePresence>
    {isWaitingApproval && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#161616]/90 p-8 text-center shadow-2xl backdrop-blur-xl"
        >
          {/* Ambient Background Glow */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Status Icons & Spinners */}
            {approvalStatus === "PENDING" && (
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gold/5 border border-gold/10 shadow-lg">
                <Loader2 className="h-10 w-10 text-gold animate-spin" />
                <span className="absolute inset-0 rounded-[28px] border border-gold/20 animate-pulse" />
              </div>
            )}

            {approvalStatus === "APPROVED" && (
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-green-500/10 border border-green-500/20 shadow-lg">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <span className="absolute inset-0 rounded-[28px] border border-green-500/20 animate-ping" />
              </div>
            )}

            {approvalStatus === "REJECTED" && (
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-red-500/10 border border-red-500/20 shadow-lg">
                <AlertCircle className="h-10 w-10 text-red-400 animate-bounce" />
              </div>
            )}

            {/* Status Text & Message */}
            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">
              {approvalStatus === "PENDING" && "Chờ phê duyệt"}
              {approvalStatus === "APPROVED" && "Tuyệt vời!"}
              {approvalStatus === "REJECTED" && "Từ chối phê duyệt"}
            </h3>

            <p className="text-gray-300 font-medium text-sm leading-relaxed mb-8 px-2">
              {approvalStatus === "PENDING" && "Đăng ký thành công. Vui lòng chờ Admin phê duyệt..."}
              {approvalStatus === "APPROVED" && "Chúc mừng, bạn đã đăng ký thành công!"}
              {approvalStatus === "REJECTED" && "Yêu cầu đăng ký của bạn bị từ chối"}
            </p>

            {/* Additional Context or Actions */}
            {approvalStatus === "PENDING" && (
              <div className="flex flex-col gap-2 items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="animate-pulse" />
                  <span>Đang tự động kiểm tra mỗi 3s</span>
                </div>
              </div>
            )}

            {approvalStatus === "APPROVED" && (
              <div className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} />
                <span>Đang chuyển về trang Đăng nhập...</span>
              </div>
            )}

            {approvalStatus === "REJECTED" && (
              <button
                type="button"
                onClick={handleDismissWaiting}
                className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 hover:border-gold hover:bg-gold/5 font-black uppercase tracking-widest text-white text-xs transition-all active:scale-95 flex items-center justify-center gap-2 group shadow-inner"
              >
                <ArrowLeft size={16} className="text-gray-400 group-hover:text-gold transition-colors" />
                <span>Quay lại</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* OTP Method Picker Modal */}
  <AnimatePresence>
    {showOtpMethodModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#161616]/90 p-8 text-center shadow-2xl backdrop-blur-xl"
        >
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 mb-6">
              <CheckCircle2 size={28} className="animate-pulse" />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">
              Nhận OTP Xác thực
            </h3>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-8">
              Vui lòng chọn kênh nhận mã xác thực
            </p>

            <div className="w-full space-y-4">
              <button
                type="button"
                onClick={() => handleSelectOtpMethod("EMAIL")}
                className="w-full h-16 rounded-2xl bg-zinc-900 border border-white/5 hover:border-gold/30 hover:bg-zinc-800/80 transition-all flex items-center gap-4 px-6 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Nhận qua Email</p>
                  <p className="text-[10px] text-zinc-500 font-semibold truncate max-w-[220px]">{formData.email}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectOtpMethod("PHONE")}
                className="w-full h-16 rounded-2xl bg-zinc-900 border border-white/5 hover:border-gold/30 hover:bg-zinc-800/80 transition-all flex items-center gap-4 px-6 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Nhận qua Số điện thoại</p>
                  <p className="text-[10px] text-zinc-500 font-semibold truncate max-w-[220px]">{formData.phone}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowOtpMethodModal(false)}
                className="w-full h-12 rounded-xl text-zinc-500 hover:text-zinc-300 font-bold uppercase text-xs tracking-wider transition-all"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* OTP Verification Modal */}
  <AnimatePresence>
    {showOtpModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#161616]/90 p-8 text-center shadow-2xl backdrop-blur-xl"
        >
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 mb-6">
              {otpMethod === "EMAIL" ? <Mail size={28} className="animate-pulse" /> : <Phone size={28} className="animate-pulse" />}
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">
              Xác thực OTP đăng ký
            </h3>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-6">
              Mã OTP đã được gửi tới {otpMethod === "EMAIL" ? `email ${formData.email}` : `số điện thoại ${formData.phone}`}
            </p>

            <form onSubmit={handleVerifyOtpAndSubmit} className="w-full space-y-4">
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="bg-black border-2 border-white/10 rounded-2xl h-14 text-2xl text-white outline-none focus:border-gold/50 focus:bg-[#202020] transition-all w-full text-center font-mono tracking-[0.3em] font-black placeholder:text-zinc-700"
              />

              {otpError && (
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1 mt-1">
                  <AlertCircle size={12} /> {otpError}
                </p>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 h-12 rounded-xl border border-white/5 hover:bg-zinc-800 text-white font-bold uppercase text-xs tracking-wider transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={otpCode.length !== 6}
                  className="flex-1 h-12 rounded-xl bg-gold text-[#0a0a0a] font-black uppercase text-xs tracking-wider hover:bg-gold-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
 </div>
 );
}
