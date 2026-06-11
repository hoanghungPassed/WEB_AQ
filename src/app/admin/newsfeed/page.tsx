"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  X, 
  Check, 
  Info,
  ShieldCheck,
  CornerDownRight,
  Pin,
  Trash2,
  Sparkles,
  Flame,
  Award,
  BookOpen,
  Share2
} from "lucide-react";
import { useRouter } from "next/navigation";

type NewsfeedUser = {
  id?: string;
  name?: string;
  username?: string;
  role?: string;
  avatar?: string;
};

type NewsfeedReply = {
  id: string;
  authorName: string;
  authorRole: string;
  authorUsername: string;
  authorAvatar?: string | null;
  text: string;
  timestamp: string;
};

type NewsfeedComment = {
  id: string;
  authorName: string;
  authorRole: string;
  authorUsername: string;
  authorAvatar?: string | null;
  text: string;
  timestamp: string;
  replies: NewsfeedReply[];
};

type NewsfeedPost = {
  id: string;
  authorName: string;
  authorRole: string;
  authorUsername: string;
  authorAvatar?: string | null;
  text: string;
  imageUrl?: string | null;
  likes: number;
  likedBy: string[];
  comments: NewsfeedComment[];
  timestamp: string;
  isPinned?: boolean;
};

interface ApiUser {
  _id?: string;
  name?: string;
  role?: string;
  username?: string;
  avatar?: string;
}

interface ApiReply {
  _id: string;
  userId?: ApiUser;
  content: string;
  createdAt: string | number | Date;
}

interface ApiComment {
  _id: string;
  userId?: ApiUser;
  content: string;
  createdAt: string | number | Date;
  replies?: ApiReply[];
}

interface ApiPost {
  _id: string;
  author?: ApiUser;
  title?: string;
  message?: string;
  imageUrl?: string;
  likes?: any[];
  comments?: ApiComment[];
  createdAt?: string | number | Date;
  isPinned?: boolean;
}

const renderSafeString = (val: any, fallback = ""): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    return val.name || val.username || val.email || fallback;
  }
  return String(val);
};

export default function NewsfeedPage() {
  const router = useRouter();
  const [user] = useState<NewsfeedUser>(() => {
    const storedUser = typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    return storedUser ? JSON.parse(storedUser) : {};
  });
  
  // Newsfeed States
  const [posts, setPosts] = useState<NewsfeedPost[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [selectedMockImage, setSelectedMockImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Threaded Comments States
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sparkle Hearts state for like interaction
  const [likeHearts, setLikeHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const loadPosts = async (isSilent = false) => {
    try {
      const response = await fetch("/api/admin/notifications?type=INFO");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const formattedPosts: NewsfeedPost[] = data.map((item: ApiPost) => {
            const authorObj = item.author as any;
            return {
              id: item._id,
              authorName: typeof authorObj === 'object' && authorObj ? (authorObj.name || "Hệ thống") : (typeof authorObj === 'string' ? authorObj : "Hệ thống"),
              authorRole: typeof authorObj === 'object' && authorObj ? (authorObj.role === "01" ? "ADMIN" : authorObj.role === "02" ? "QL CÔNG VIỆC" : authorObj.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN") : "NHÂN VIÊN",
              authorUsername: typeof authorObj === 'object' && authorObj ? (authorObj.username || "system") : "system",
              authorAvatar: typeof authorObj === 'object' && authorObj ? (authorObj.avatar || null) : null,
              text: item.message || item.title || "",
              imageUrl: item.imageUrl || null,
              likes: (item.likes || []).length,
              likedBy: (item.likes || []).map((l: any) => l._id || l),
              comments: (item.comments || []).map((c: ApiComment) => {
                const commentUser = c.userId as any;
                return {
                  id: c._id,
                  authorName: typeof commentUser === 'object' && commentUser ? (commentUser.name || "Người dùng") : (typeof commentUser === 'string' ? commentUser : "Người dùng"),
                  authorRole: typeof commentUser === 'object' && commentUser ? (commentUser.role === "01" ? "ADMIN" : commentUser.role === "02" ? "QL CÔNG VIỆC" : commentUser.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN") : "NHÂN VIÊN",
                  authorUsername: typeof commentUser === 'object' && commentUser ? (commentUser.username || "user") : "user",
                  authorAvatar: typeof commentUser === 'object' && commentUser ? (commentUser.avatar || null) : null,
                  text: c.content,
                  timestamp: new Date(c.createdAt || Date.now()).toLocaleString("vi-VN"),
                  replies: (c.replies || []).map((r: ApiReply) => {
                    const replyUser = r.userId as any;
                    return {
                      id: r._id,
                      authorName: typeof replyUser === 'object' && replyUser ? (replyUser.name || "Người dùng") : (typeof replyUser === 'string' ? replyUser : "Người dùng"),
                      authorRole: typeof replyUser === 'object' && replyUser ? (replyUser.role === "01" ? "ADMIN" : replyUser.role === "02" ? "QL CÔNG VIỆC" : replyUser.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN") : "NHÂN VIÊN",
                      authorUsername: typeof replyUser === 'object' && replyUser ? (replyUser.username || "user") : "user",
                      authorAvatar: typeof replyUser === 'object' && replyUser ? (replyUser.avatar || null) : null,
                      text: r.content,
                      timestamp: new Date(r.createdAt || Date.now()).toLocaleString("vi-VN"),
                    };
                  })
                };
              }),
              timestamp: item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "",
              isPinned: item.isPinned || false
            };
          });
          setPosts(formattedPosts);
          return;
        }
      }
    } catch (err) {
      console.error("Error loading newsfeed posts:", err);
    }
    if (!isSilent && posts.length === 0) {
      setPosts([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchPosts = async () => {
      await loadPosts();
    };
    if (isMounted) fetchPosts();

    const intervalId = setInterval(() => {
      if (isMounted) void loadPosts(true);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleCreatePost = async () => {
    if (!newPostText.trim() && !selectedMockImage) return;
    
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Bài viết mới",
          message: newPostText,
          imageUrl: selectedMockImage,
          type: "POST"
        })
      });
      if (res.ok) {
        await loadPosts();
        
        setNewPostText("");
        setSelectedMockImage(null);

        setSuccessToast("Đăng bài viết thành công!");
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSuccessToast(errData.error || "Lỗi khi đăng bài!");
        setTimeout(() => setSuccessToast(null), 3000);
      }
    } catch (err) {
      setSuccessToast("Lỗi khi đăng bài!");
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const triggerLikeEffect = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newHearts = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 40,
      y: y - 10 - Math.random() * 30
    }));

    setLikeHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => {
      setLikeHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id)));
    }, 1000);
  };

  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    triggerLikeEffect(e);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST", // API supports like POST or PUT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, action: "LIKE" })
      });
      if (!res.ok) {
        // Fallback to PUT if POST is not the endpoint
        await fetch("/api/admin/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: postId, action: "LIKE" })
        });
      }
      await loadPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId] || "";
    if (!text.trim()) return;

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, action: "COMMENT", content: text })
      });
      if (res.ok) {
        await loadPosts();
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
        setSuccessToast("Đã thêm bình luận!");
        setTimeout(() => setSuccessToast(null), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (postId: string, commentId: string) => {
    const text = replyInputs[commentId] || "";
    if (!text.trim()) return;

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, action: "REPLY", commentId, content: text })
      });
      if (res.ok) {
        await loadPosts();
        setReplyInputs(prev => ({ ...prev, [commentId]: "" }));
        setActiveReplyId(null);
        setSuccessToast("Đã gửi phản hồi!");
        setTimeout(() => setSuccessToast(null), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePinPost = async (postId: string) => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, action: "TOGGLE_PIN" })
      });
      if (res.ok) {
        await loadPosts();
        setSuccessToast("Đã thay đổi trạng thái ghim!");
        setTimeout(() => setSuccessToast(null), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
      try {
        const res = await fetch(`/api/admin/notifications?id=${postId}`, { method: "DELETE" });
        if (res.ok) {
          await loadPosts();
          setSuccessToast("Đã xóa bài viết thành công!");
          setTimeout(() => setSuccessToast(null), 2000);
        } else {
          const errData = await res.json().catch(() => ({}));
          setSuccessToast(errData.error || "Lỗi khi xóa bài viết!");
          setTimeout(() => setSuccessToast(null), 2000);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Clipboard paste support for copying images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < (items || []).length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setSelectedMockImage(event.target.result as string);
              setSuccessToast("Đã dán ảnh thành công!");
              setTimeout(() => setSuccessToast(null), 3000);
            }
          };
          reader.readAsDataURL(file);
        }
        e.preventDefault();
        break;
      }
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && (files || []).length > 0) {
      const file = files[0];
      if (file.type.indexOf("image") !== -1) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setSelectedMockImage(event.target.result as string);
            setSuccessToast("Đã kéo thả tải ảnh lên!");
            setTimeout(() => setSuccessToast(null), 3000);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    return "NHÂN VIÊN";
  };

  const getRoleBadgeStyle = (roleName?: string) => {
    const role = roleName?.toUpperCase();
    if (role === "ADMIN") {
      return "bg-gradient-to-r from-[#ef4444] to-[#f97316] text-[#ffffff] border border-[#ef4444]/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
    }
    if (role === "QL CÔNG VIỆC" || role === "QL NHÂN SỰ" || role === "QUẢN LÝ CÔNG VIỆC") {
      return "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#ffffff] border border-[#f59e0b]/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]";
    }
    return "bg-[#1a1a1a]/80 text-[#d4d4d8] border border-[#ffeb3b]/10";
  };

  return (
    <div className="space-y-6 pb-12" style={{ color: "#d4d4d8" }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] bg-[#ffeb3b] text-[#000000] px-6 py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(255,235,59,0.25)] flex items-center gap-3 text-xs font-black uppercase tracking-wider border border-[#ffeb3b]/30"
          >
            <Check size={16} className="text-[#000000]" /> {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Sparkle Hearts */}
      <div className="fixed inset-0 pointer-events-none z-[600]">
        <AnimatePresence>
          {likeHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, scale: 0.5, x: heart.x, y: heart.y }}
              animate={{ opacity: 0, scale: 1.5, y: heart.y - 120, x: heart.x + (Math.random() - 0.5) * 60 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute text-[#ef4444]"
            >
              <Heart size={20} fill="currentColor" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0c0c0c]/80 backdrop-blur-md border border-[#ffeb3b]/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-[#ffeb3b]/5 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={() => router.push("/admin")}
            className="h-10 w-10 bg-[#161616] hover:bg-[#ffeb3b] text-[#ffffff] hover:text-[#000000] rounded-xl flex items-center justify-center border border-[#ffeb3b]/15 hover:border-[#ffeb3b] transition-all duration-300 hover:scale-105 shadow-lg group"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#ffeb3b] flex items-center gap-2.5 tracking-tight uppercase">
              Bảng Tin Nội Bộ
              <Sparkles size={20} className="text-[#ffeb3b] animate-pulse" />
            </h1>
            <p className="font-semibold text-[10px] uppercase tracking-wider text-[#a3a3a3] mt-0.5">Mạng xã hội nội bộ dành cho thành viên AQ MEDIA</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <span className="bg-[#ffeb3b]/10 text-[#ffeb3b] border border-[#ffeb3b]/30 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(255,235,59,0.05)]">
            {(posts || []).length} BÀI ĐĂNG TỔNG CỘNG
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Center: Compose post + Posts Feed stream */}
        <div className="lg:col-span-8 space-y-6">
          {/* Write post card with Drag and Drop handlers */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-[#0f0f0f]/60 backdrop-blur-md border rounded-[28px] p-6 shadow-2xl relative overflow-hidden transition-all duration-500 ${
              isDragging ? "border-[#ffeb3b] bg-[#ffeb3b]/5 scale-[1.01] shadow-[0_0_30px_rgba(255,235,59,0.1)]" : "border-[#ffeb3b]/10"
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffeb3b]/2 blur-[40px] pointer-events-none" />
            <h3 className="text-xs font-black text-[#ffffff] uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#fff' }}>
              <Send size={14} className="text-[#ffeb3b] animate-bounce" /> Tạo bài viết mới
            </h3>

            <div className="relative group">
              <textarea
                placeholder={`Chào ${user?.name || "bạn"}, hôm nay bạn thế nào? Ctrl+V để dán hoặc kéo thả ảnh trực tiếp tại đây...`}
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                onPaste={handlePaste}
                className="w-full h-28 bg-[#050505]/60 border border-[#ffeb3b]/10 rounded-2xl p-4 text-xs text-[#ffffff] placeholder-[#525252] focus:outline-none focus:border-[#ffeb3b]/30 transition-all resize-none custom-scrollbar font-bold shadow-inner"
                style={{ color: '#fff' }}
              />
              <div className="absolute bottom-3 right-3 text-[9px] text-[#525252] pointer-events-none uppercase font-black tracking-widest">
                {newPostText.length} kí tự
              </div>
            </div>

            {/* Selected Preset Image Preview */}
            <AnimatePresence>
              {selectedMockImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="mt-3 relative rounded-2xl overflow-hidden border border-[#ffeb3b]/10 group h-40 shadow-lg"
                >
                  <Image src={selectedMockImage!} alt="Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  <button 
                    onClick={() => setSelectedMockImage(null)}
                    className="absolute top-3 right-3 h-8 w-8 bg-[#000000]/80 hover:bg-[#ef4444] rounded-full flex items-center justify-center text-[#ffffff] transition-all duration-300 shadow-xl border border-[#ffeb3b]/10 hover:border-transparent scale-100 hover:scale-110"
                    style={{ color: '#fff' }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#ffeb3b]/5 pt-4">
              <button 
                onClick={handleCreatePost}
                disabled={!newPostText.trim() && !selectedMockImage}
                className="h-9 px-6 bg-gradient-to-r from-[#ffeb3b] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#ffeb3b] disabled:opacity-30 disabled:cursor-not-allowed text-[#000000] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-[0_4px_20px_rgba(255,235,59,0.15)] hover:shadow-[0_4px_25px_rgba(255,235,59,0.25)] hover:scale-[1.02]"
              >
                Đăng bài viết
              </button>
            </div>
          </div>

          {/* Posts Feed Stream */}
          <div className="space-y-5">
            <AnimatePresence>
              {(() => {
                const sortedPosts = [...posts].sort((a, b) => {
                  const aPinned = a.isPinned ? 1 : 0;
                  const bPinned = b.isPinned ? 1 : 0;
                  if (aPinned !== bPinned) return bPinned - aPinned;
                  return 0;
                });
                return (sortedPosts || []).map((post) => {
                  const userId = user?.id || "anon";
                  const hasLiked = Array.isArray(post.likedBy) && post.likedBy.includes(userId);
                  return (
                    <motion.div 
                      id={post.id}
                      key={post.id}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-[#0f0f0f]/60 backdrop-blur-md border rounded-[28px] p-6 shadow-xl text-left relative transition-all duration-500 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)] ${
                        post.isPinned ? "border-[#ffeb3b]/30 shadow-[0_0_20px_rgba(255,235,59,0.03)]" : "border-[#ffeb3b]/10"
                      }`}
                    >
                      {/* Pinned Gradient Border Effect */}
                      {post.isPinned && (
                        <div className="absolute inset-0 rounded-[28px] border-2 border-transparent bg-gradient-to-r from-[#ffeb3b]/20 to-transparent pointer-events-none" style={{ maskImage: "linear-gradient(#fff, #fff) exclude, linear-gradient(#fff, #fff)" }} />
                      )}

                      {/* Post Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#ffeb3b]/5 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {post.authorAvatar ? (
                              <img src={post.authorAvatar} alt={renderSafeString(post.authorName)} className="h-10 w-10 rounded-full object-cover border-2 border-[#ffeb3b]/20 shadow-md" />
                            ) : (
                              <div className="h-10 w-10 bg-[#ffeb3b]/10 text-[#ffeb3b] border-2 border-[#ffeb3b]/20 rounded-full flex items-center justify-center font-black text-base uppercase shadow-md">
                                {renderSafeString(post.authorName).charAt(0) || "?"}
                              </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] border-2 border-[#000000] rounded-full" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-[#ffffff] hover:text-[#ffeb3b] transition-colors" style={{ color: '#fff' }}>{renderSafeString(post.authorName, "Hệ thống")}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black tracking-widest uppercase ${getRoleBadgeStyle(renderSafeString(post.authorRole))}`}>
                                {renderSafeString(post.authorRole, "NHÂN VIÊN")}
                              </span>
                              {post.isPinned && (
                                <span className="px-2.5 py-0.5 rounded-full text-[7px] font-black tracking-widest uppercase bg-[#ffeb3b] text-[#000000] flex items-center gap-1 shadow-[0_0_10px_rgba(255,235,59,0.3)] animate-pulse">
                                  <Pin size={8} className="fill-current rotate-45" /> ĐÃ GHIM
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] text-[#a3a3a3] font-mono font-bold mt-0.5 block tracking-wider">{renderSafeString(post.timestamp)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleTogglePinPost(post.id)}
                            className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                              post.isPinned 
                                ? "bg-[#ffeb3b]/20 text-[#ffeb3b] border-[#ffeb3b]/30 shadow-[0_0_10px_rgba(255,235,59,0.1)]" 
                                : "bg-[#161616] text-[#a3a3a3] border-[#ffeb3b]/10 hover:bg-[#ffeb3b] hover:text-[#000000] hover:border-[#ffeb3b]"
                            }`}
                            title={post.isPinned ? "Bỏ ghim bài viết" : "Ghim bài viết"}
                          >
                            <Pin size={12} className={post.isPinned ? "rotate-45" : ""} />
                          </button>

                          {(post.authorUsername === user?.username || user?.role === "01" || user?.role === "02") && (
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="h-8 w-8 bg-[#161616] hover:bg-[#ef4444]/15 hover:text-[#ef4444] text-[#a3a3a3] border border-[#ffeb3b]/10 hover:border-[#ef4444]/30 rounded-xl flex items-center justify-center transition-all duration-300"
                              title="Xóa bài viết"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="space-y-3">
                        <p className="text-xs text-[#d4d4d8] font-bold leading-relaxed whitespace-pre-wrap">{renderSafeString(post.text)}</p>
                        {post.imageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-[#ffeb3b]/10 max-h-[300px] relative h-72 group cursor-pointer shadow-lg">
                            <Image 
                              src={post.imageUrl!} 
                              alt={post.authorName ? `${post.authorName} post` : "Bài viết"} 
                              fill 
                              className="object-cover transition-transform duration-700 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                          </div>
                        )}
                      </div>

                      {/* Footer reaction stats */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#ffeb3b]/5 text-[#a3a3a3] text-[10px] font-bold mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]">
                            <Heart size={10} fill="currentColor" />
                          </div>
                          <span className="tracking-wider">{post.likes || 0} lượt thích</span>
                        </div>
                        <div className="tracking-wider flex items-center gap-2">
                          <span>{post.comments?.length || 0} bình luận</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 pt-3 border-t border-[#ffeb3b]/5 mt-2">
                        <button 
                          onClick={(e) => handleLikePost(post.id, e)}
                          className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
                            hasLiked 
                              ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30 shadow-[0_4px_15px_rgba(239,68,68,0.1)]" 
                              : "bg-[#161616] text-[#a3a3a3] border-[#ffeb3b]/10 hover:text-[#ef4444] hover:bg-[#ef4444]/5 hover:border-[#ef4444]/20"
                          }`}
                        >
                          <Heart size={14} fill={hasLiked ? "currentColor" : "none"} className={hasLiked ? "animate-wiggle" : ""} />
                          <span>Thích</span>
                        </button>

                        <div className="flex-1 h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#a3a3a3] bg-[#161616] border border-[#ffeb3b]/10 hover:bg-[#1f1f1f] hover:text-[#ffeb3b] cursor-pointer transition-all duration-300">
                          <MessageSquare size={14} />
                          <span>Bình luận</span>
                        </div>
                      </div>

                      {/* Threaded Nested Comments list box */}
                      {post.comments && (post.comments || []).length > 0 && (
                        <div className="space-y-4 bg-[#050505]/40 border border-[#ffeb3b]/5 rounded-2xl p-4 mt-3">
                          {(post.comments || []).map((cmt: NewsfeedComment) => (
                            <div key={cmt.id} className="space-y-3 relative">
                              
                              {/* Main Comment */}
                              <div className="text-xs relative z-10 flex gap-3">
                                {/* Left: Avatar + Connector lines */}
                                <div className="flex flex-col items-center flex-shrink-0 relative">
                                  {cmt.authorAvatar ? (
                                    <img src={cmt.authorAvatar} alt={renderSafeString(cmt.authorName)} className="w-7 h-7 rounded-full object-cover border border-[#ffeb3b]/20 shadow-md" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-[#ffeb3b]/10 text-[#ffeb3b] flex items-center justify-center text-[11px] font-black border border-[#ffeb3b]/20 shadow-md">
                                      {renderSafeString(cmt.authorName).charAt(0) || "?"}
                                    </div>
                                  )}
                                  
                                  {/* Connector Line to replies */}
                                  {cmt.replies && cmt.replies.length > 0 && (
                                    <div className="w-[1.5px] bg-gradient-to-b from-[#ffeb3b]/20 via-[#ffeb3b]/10 to-transparent absolute top-8 bottom-0" />
                                  )}
                                </div>

                                {/* Right: Comment Content */}
                                <div className="flex-grow bg-[#121212]/40 rounded-2xl p-3 border border-[#ffeb3b]/5">
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-[#ffffff]" style={{ color: '#fff' }}>{renderSafeString(cmt.authorName, "Người dùng")}</span>
                                      <span className="text-[7px] font-black bg-[#ffeb3b]/5 text-[#ffeb3b] border border-[#ffeb3b]/20 px-1.5 py-0.5 rounded uppercase tracking-wider">{renderSafeString(cmt.authorRole, "NHÂN VIÊN")}</span>
                                    </div>
                                    <span className="text-[8px] font-mono text-[#525252] font-semibold">{renderSafeString(cmt.timestamp)}</span>
                                  </div>
                                  <p className="text-[#d4d4d8] font-bold pl-0.5">{renderSafeString(cmt.text)}</p>
                                  
                                  {/* Reply button link */}
                                  <div className="mt-2 pl-0.5 flex gap-4">
                                    <button 
                                      onClick={() => {
                                        setActiveReplyId(activeReplyId === cmt.id ? null : cmt.id);
                                        setReplyInputs(prev => ({ ...prev, [cmt.id]: "" }));
                                      }}
                                      className="text-[9px] font-black text-[#ffeb3b] uppercase tracking-widest hover:underline flex items-center gap-1 transition-colors"
                                    >
                                      <CornerDownRight size={10} /> Phản hồi
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Nested Replies Rendering */}
                              {cmt.replies && (cmt.replies || []).length > 0 && (
                                <div className="ml-10 space-y-3 relative">
                                  {(cmt.replies || []).map((reply: NewsfeedReply) => (
                                    <div key={reply.id} className="text-[11px] flex gap-3 relative">
                                      
                                      {/* Curved branch connecter line */}
                                      <div className="w-4 h-6 border-l-[1.5px] border-b-[1.5px] border-[#ffeb3b]/20 rounded-bl-xl absolute -left-5 -top-1" />

                                      {/* Reply Avatar */}
                                      {reply.authorAvatar ? (
                                        <img src={reply.authorAvatar} alt={renderSafeString(reply.authorName)} className="w-5.5 h-5.5 rounded-full object-cover border border-[#ffeb3b]/20 flex-shrink-0 shadow-sm" />
                                      ) : (
                                        <div className="w-5.5 h-5.5 rounded-full bg-[#ffeb3b]/10 text-[#ffeb3b] flex items-center justify-center text-[9px] font-black border border-[#ffeb3b]/20 flex-shrink-0 shadow-sm">
                                          {renderSafeString(reply.authorName).charAt(0) || "?"}
                                        </div>
                                      )}

                                      {/* Reply Content */}
                                      <div className="flex-grow bg-[#161616]/40 border border-[#ffeb3b]/5 rounded-xl p-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-black text-[#ffffff]" style={{ color: '#fff' }}>{renderSafeString(reply.authorName, "Người dùng")}</span>
                                            <span className="text-[6px] font-black bg-[#ffeb3b]/5 text-[#ffeb3b] border border-[#ffeb3b]/20 px-1 py-0.5 rounded uppercase tracking-wider">{renderSafeString(reply.authorRole, "NHÂN VIÊN")}</span>
                                          </div>
                                          <span className="text-[8px] font-mono text-[#525252] font-semibold">{renderSafeString(reply.timestamp)}</span>
                                        </div>
                                        <p className="text-[#a3a3a3] font-bold">{renderSafeString(reply.text)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Inline Reply Input Box */}
                              <AnimatePresence>
                                {activeReplyId === cmt.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="ml-10 flex items-center gap-2 mt-2 relative"
                                  >
                                    {/* Curved connecter line */}
                                    <div className="w-4 h-6 border-l-[1.5px] border-b-[1.5px] border-[#ffeb3b]/20 rounded-bl-xl absolute -left-5 -top-1" />

                                    <input 
                                      placeholder={`Phản hồi ${cmt.authorName}...`}
                                      value={replyInputs[cmt.id] || ""}
                                      onChange={(e) => setReplyInputs({ ...replyInputs, [cmt.id]: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddReply(post.id, cmt.id);
                                      }}
                                      className="flex-grow h-8 bg-[#050505]/80 border border-[#ffeb3b]/10 rounded-xl px-3 text-[11px] text-[#ffffff] focus:outline-none focus:border-[#ffeb3b]/30 transition-all font-bold shadow-inner"
                                      style={{ color: '#fff' }}
                                    />
                                    <button 
                                      onClick={() => handleAddReply(post.id, cmt.id)}
                                      className="h-8 px-4 bg-[#ffeb3b] hover:bg-[#f59e0b] text-[#000000] rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest transition-colors duration-300 shadow-md"
                                    >
                                      Gửi
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Comment Input Box */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[#ffeb3b]/5 mt-3">
                        <input
                          placeholder="Viết bình luận bài đăng..."
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(post.id);
                          }}
                          className="flex-grow h-9 bg-[#050505]/60 border border-[#ffeb3b]/10 rounded-xl px-4.5 text-[11px] text-[#ffffff] focus:outline-none focus:border-[#ffeb3b]/30 transition-all font-bold shadow-inner"
                          style={{ color: '#fff' }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="h-9 w-9 rounded-xl bg-[#ffeb3b] hover:bg-[#f59e0b] text-[#000000] flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-md shadow-[#ffeb3b]/5"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </AnimatePresence>

            {(posts || []).length === 0 && (
              <div className="h-44 rounded-3xl border border-[#ffeb3b]/10 bg-[#0f0f0f]/40 flex flex-col items-center justify-center text-center p-6 shadow-lg">
                <MessageSquare size={36} className="text-[#525252] mb-3 animate-pulse" />
                <h4 className="text-[#ffffff] font-black uppercase tracking-widest text-[11px]" style={{ color: '#fff' }}>Chưa có dữ liệu bài viết</h4>
                <p className="text-[9px] text-[#a3a3a3] mt-1 font-semibold uppercase tracking-wider">Hãy đăng bài chia sẻ đầu tiên trên Bảng tin nội bộ nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Profile Card & Quick Stats */}
        <div className="lg:col-span-4 space-y-5 hidden lg:block">
          {/* User profile details: Staff Passport */}
          <div className="bg-[#0f0f0f]/60 backdrop-blur-md border border-[#ffeb3b]/10 rounded-[28px] p-6 shadow-2xl relative overflow-hidden group text-center">
            {/* Staff Banner Background */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-br from-[#ffeb3b]/20 via-[#4f46e5]/10 to-transparent pointer-events-none" />
            
            <div className="relative mt-8 flex flex-col items-center">
              {/* Outer Infinite Spinning Ring */}
              <div className="relative p-1 rounded-full border border-[#ffeb3b]/10 group-hover:border-[#ffeb3b]/40 transition-all duration-500">
                {user?.avatar ? (
                  <img src={user.avatar} alt="User Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-[#ffeb3b] shadow-xl shadow-[#ffeb3b]/10" />
                ) : (
                  <div className="h-16 w-16 bg-[#ffeb3b]/10 border-2 border-[#ffeb3b] text-[#ffeb3b] rounded-full flex items-center justify-center font-black text-2xl uppercase shadow-xl shadow-[#ffeb3b]/10">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-[#10b981] border-2 border-[#0f0f0f] rounded-full shadow-md animate-pulse" />
              </div>
              
              <h3 className="text-base font-black text-[#ffffff] mt-4 flex items-center gap-1.5 hover:text-[#ffeb3b] transition-colors" style={{ color: '#fff' }}>
                {user?.name || "Người dùng"}
                <Award size={16} className="text-[#ffeb3b] animate-bounce" />
              </h3>
              
              <p className="text-[8px] font-black tracking-widest uppercase text-[#ffeb3b] bg-[#ffeb3b]/10 border border-[#ffeb3b]/20 px-3 py-1 rounded-full mt-1.5 shadow-[0_0_10px_rgba(255,235,59,0.05)]">
                {getRoleLabel(user?.role)}
              </p>
            </div>

            {/* Passport Information Details */}
            <div className="grid grid-cols-2 gap-3 border-t border-[#ffeb3b]/5 mt-5 pt-4 text-left">
              <div>
                <span className="text-[8px] font-black text-[#a3a3a3] uppercase tracking-widest block">Tài khoản nhân sự</span>
                <span className="text-[11px] font-mono font-bold text-[#ffffff] mt-0.5 block truncate" style={{ color: '#fff' }}>{user?.username || "system"}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-[#a3a3a3] uppercase tracking-widest block">Mã số AQ ID</span>
                <span className="text-[11px] font-mono font-bold text-[#ffffff] mt-0.5 block truncate" style={{ color: '#fff' }}>#{user?.id || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Quick instructions & guidelines: Cyber style */}
          <div className="bg-[#0f0f0f]/60 backdrop-blur-md border border-[#ffeb3b]/10 rounded-[28px] p-6 shadow-2xl space-y-4">
            <h3 className="text-[10px] font-black text-[#ffffff] uppercase tracking-widest flex items-center gap-2 border-b border-[#ffeb3b]/5 pb-3" style={{ color: '#fff' }}>
              <ShieldCheck size={14} className="text-[#ffeb3b]" /> Quy tắc văn hóa nội bộ
            </h3>
            
            <ul className="space-y-3">
              <li className="flex gap-3 items-start text-[10px] text-[#a3a3a3] font-bold">
                <div className="h-6 w-6 rounded-lg bg-[#ffeb3b]/10 flex items-center justify-center text-[#ffeb3b] flex-shrink-0 border border-[#ffeb3b]/20">
                  <Sparkles size={11} />
                </div>
                <div className="leading-relaxed">
                  <span className="text-[#ffffff] block mb-0.5 uppercase tracking-wide text-[9px] font-black" style={{ color: '#fff' }}>Sáng tạo & Tích cực</span>
                  Chia sẻ các sáng kiến, niềm vui và tin tức truyền cảm hứng nội bộ.
                </div>
              </li>
              <li className="flex gap-3 items-start text-[10px] text-[#a3a3a3] font-bold">
                <div className="h-6 w-6 rounded-lg bg-[#ffeb3b]/10 flex items-center justify-center text-[#ffeb3b] flex-shrink-0 border border-[#ffeb3b]/20">
                  <Flame size={11} />
                </div>
                <div className="leading-relaxed">
                  <span className="text-[#ffffff] block mb-0.5 uppercase tracking-wide text-[9px] font-black" style={{ color: '#fff' }}>Hỗ trợ đồng nghiệp</span>
                  Luôn lịch sự, văn minh và tôn trọng quyền riêng tư của mọi người.
                </div>
              </li>
              <li className="flex gap-3 items-start text-[10px] text-[#a3a3a3] font-bold">
                <div className="h-6 w-6 rounded-lg bg-[#ffeb3b]/10 flex items-center justify-center text-[#ffeb3b] flex-shrink-0 border border-[#ffeb3b]/20">
                  <BookOpen size={11} />
                </div>
                <div className="leading-relaxed">
                  <span className="text-[#ffffff] block mb-0.5 uppercase tracking-wide text-[9px] font-black" style={{ color: '#fff' }}>Bảo mật dữ liệu</span>
                  Nghiêm cấm đăng tải tài liệu nhạy cảm hoặc bí mật kinh doanh AQ.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
