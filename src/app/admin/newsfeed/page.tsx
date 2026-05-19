"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  X, 
  Check, 
  Users, 
  Calendar, 
  Info,
  ShieldCheck,
  TrendingUp,
  Bookmark
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewsfeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Newsfeed States
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [selectedMockImage, setSelectedMockImage] = useState<string | null>(null);
  const [showImagePresets, setShowImagePresets] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const loadPosts = () => {
    const saved = localStorage.getItem("global_newsfeed_posts");
    if (saved) {
      setPosts(JSON.parse(saved));
    } else {
      const initialPosts = [
        {
          id: "post-1",
          authorName: "Nguyễn Admin",
          authorRole: "ADMIN",
          text: "Chào mừng toàn thể anh chị em đến với hệ thống quản trị AQ MEDIA phiên bản nâng cấp hoàn hảo! Chúc cả nhà một tuần làm việc hiệu suất bùng nổ, vượt chỉ tiêu KPI đã đề ra! 🚀🔥",
          imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60",
          likes: 12,
          likedBy: [],
          comments: [
            {
              id: "cmt-1",
              authorName: "Trần Quản Lý CV",
              authorRole: "QL CÔNG VIỆC",
              text: "Phiên bản mới đẹp xuất sắc sếp ơi! Hệ thống mượt mà quá! 😍",
              timestamp: "10 phút trước"
            }
          ],
          timestamp: "1 giờ trước"
        },
        {
          id: "post-2",
          authorName: "Trần Quản Lý CV",
          authorRole: "QL CÔNG VIỆC",
          text: "Mọi người chú ý hoàn thành phân công mail trong ngày nhé! Ai thiếu link nhớ cập nhật ngay trước 17:00 nha. Cảm ơn cả nhà!",
          likes: 8,
          likedBy: [],
          comments: [],
          timestamp: "3 giờ trước"
        }
      ];
      localStorage.setItem("global_newsfeed_posts", JSON.stringify(initialPosts));
      setPosts(initialPosts);
    }
  };

  useEffect(() => {
    loadPosts();
    // Storage event sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_newsfeed_posts" || e.key === "newsfeed_trigger") {
        const saved = localStorage.getItem("global_newsfeed_posts");
        if (saved) setPosts(JSON.parse(saved));
      }
    };
    window.addEventListener("storage", handleStorage);

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      const saved = localStorage.getItem("global_newsfeed_posts");
      if (saved) setPosts(JSON.parse(saved));
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleCreatePost = () => {
    if (!newPostText.trim() && !selectedMockImage) return;
    
    const newPost = {
      id: `post_${Date.now()}`,
      authorName: user?.name || "Anonymous",
      authorRole: user?.role === "01" ? "ADMIN" : user?.role === "02" ? "QL CÔNG VIỆC" : user?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN",
      text: newPostText,
      imageUrl: selectedMockImage,
      likes: 0,
      likedBy: [],
      comments: [],
      timestamp: "Vừa xong"
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    localStorage.setItem("global_newsfeed_posts", JSON.stringify(updated));
    localStorage.setItem("newsfeed_trigger", Date.now().toString());

    // Sync trigger to database
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_newsfeed_posts: JSON.stringify(updated) })
    }).catch(err => console.error("Newsfeed sync error:", err));
    
    setNewPostText("");
    setSelectedMockImage(null);
    setShowImagePresets(false);

    setSuccessToast("Đăng bài viết thành công!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleLikePost = (postId: string) => {
    const updated = posts.map(p => {
      if (p.id === postId) {
        const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
        const userId = user?.id || "anon";
        const hasLiked = likedBy.includes(userId);
        
        let newLikedBy;
        let newLikes = p.likes || 0;
        if (hasLiked) {
          newLikedBy = likedBy.filter((id: string) => id !== userId);
          newLikes = Math.max(0, newLikes - 1);
        } else {
          newLikedBy = [...likedBy, userId];
          newLikes += 1;
        }

        return { ...p, likes: newLikes, likedBy: newLikedBy };
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem("global_newsfeed_posts", JSON.stringify(updated));
    localStorage.setItem("newsfeed_trigger", Date.now().toString());

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_newsfeed_posts: JSON.stringify(updated) })
    }).catch(err => console.error("Newsfeed sync error:", err));
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId] || "";
    if (!text.trim()) return;

    const updated = posts.map(p => {
      if (p.id === postId) {
        const comments = Array.isArray(p.comments) ? p.comments : [];
        const newCmt = {
          id: `cmt_${Date.now()}`,
          authorName: user?.name || "Anonymous",
          authorRole: user?.role === "01" ? "ADMIN" : user?.role === "02" ? "QL CÔNG VIỆC" : user?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN",
          text: text,
          timestamp: "Vừa xong"
        };
        return { ...p, comments: [...comments, newCmt] };
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem("global_newsfeed_posts", JSON.stringify(updated));
    localStorage.setItem("newsfeed_trigger", Date.now().toString());

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_newsfeed_posts: JSON.stringify(updated) })
    }).catch(err => console.error("Newsfeed sync error:", err));
    
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const getRoleLabel = (role: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    return "NHÂN VIÊN";
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider border border-white/10"
          >
            <Check size={16} /> {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-48 w-48 bg-gold/5 blur-[80px] -mr-24 -mt-24 pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={() => router.push("/admin")}
            className="h-12 w-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center border border-white/10 transition-all hover:scale-105"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
              Bảng Tin Nội Bộ
            </h1>
            <p className="text-gray-500 mt-1 font-medium text-xs">Mạng xã hội nội bộ dành cho thành viên của AQ MEDIA</p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <span className="bg-gold/10 text-gold border border-gold/30 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            {posts.length} BÀI ĐĂNG
          </span>
        </div>
      </div>

      {/* Newsfeed Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Profile Card & Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* User profile details */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-xl relative overflow-hidden group text-center">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
            
            <div className="relative mt-8 flex flex-col items-center">
              <div className="h-20 w-20 bg-gold/10 border-2 border-gold text-gold rounded-full flex items-center justify-center font-black text-2xl uppercase shadow-lg shadow-gold/10">
                {user?.name?.charAt(0) || "U"}
              </div>
              
              <h3 className="text-lg font-black text-white mt-4">{user?.name || "Người dùng"}</h3>
              <p className="text-[9px] font-black tracking-widest uppercase text-gold bg-gold/5 border border-gold/20 px-2 py-0.5 rounded-full mt-1.5">
                {getRoleLabel(user?.role)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 mt-6 pt-6 text-left">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Tài khoản</span>
                <span className="text-xs font-mono font-bold text-gray-300 mt-0.5 block truncate">{user?.username || "N/A"}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Mã số</span>
                <span className="text-xs font-mono font-bold text-gray-300 mt-0.5 block truncate">#{user?.id || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Quick instructions & guidelines */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <ShieldCheck size={14} className="text-gold" /> Quy tắc ứng xử Bảng tin
            </h3>
            
            <ul className="space-y-3">
              <li className="flex gap-2.5 items-start text-[11px] text-gray-400 font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span>Chia sẻ thông tin tích cực, văn minh, tôn trọng đồng nghiệp.</span>
              </li>
              <li className="flex gap-2.5 items-start text-[11px] text-gray-400 font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span>Tuyệt đối không đăng nội dung nhạy cảm hoặc thông tin sai sự thật.</span>
              </li>
              <li className="flex gap-2.5 items-start text-[11px] text-gray-400 font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span>Tuân thủ quy chế và bảo mật dữ liệu nội bộ AQ MEDIA.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Center: Compose post + Posts Feed stream */}
        <div className="lg:col-span-2 space-y-6">
          {/* Write post card */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-xl relative overflow-hidden">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Send size={16} className="text-gold" /> Tạo bài viết mới
            </h3>

            <textarea
              placeholder={`Chào ${user?.name || "bạn"}, hôm nay bạn thế nào? Chia sẻ niềm vui cùng AQ MEDIA nào...`}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              className="w-full h-28 bg-black/20 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-gold/50 transition-all resize-none custom-scrollbar font-bold"
            />

            {/* Selected Preset Image Preview */}
            {selectedMockImage && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-white/10 group h-40">
                <img src={selectedMockImage} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedMockImage(null)}
                  className="absolute top-2 right-2 h-8 w-8 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
              <button 
                onClick={() => setShowImagePresets(!showImagePresets)}
                className={`h-10 px-4 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  showImagePresets ? "bg-gold/15 text-gold border-gold/30" : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10"
                }`}
              >
                <ImageIcon size={14} /> Chèn ảnh mô phỏng
              </button>

              <button 
                onClick={handleCreatePost}
                disabled={!newPostText.trim() && !selectedMockImage}
                className="h-10 px-6 bg-gold hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed text-sidebar rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-gold/20"
              >
                Đăng bài
              </button>
            </div>

            {/* Presets Grid */}
            {showImagePresets && (
              <div className="mt-4 p-4 bg-black/30 border border-white/5 rounded-2xl space-y-3">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <Info size={12} className="text-gold" /> Chọn ảnh mô phỏng chất lượng cao:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60", name: "Dashboard" },
                    { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=60", name: "Teamwork" },
                    { url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60", name: "Workspace" }
                  ].map((preset, idx) => (
                    <div 
                      key={`preset-grid-${idx}`}
                      onClick={() => {
                        setSelectedMockImage(preset.url);
                        setShowImagePresets(false);
                      }}
                      className="cursor-pointer h-16 rounded-xl overflow-hidden border border-white/10 hover:border-gold transition-all relative group"
                    >
                      <img src={preset.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="text-[9px] text-white font-black uppercase tracking-wider">{preset.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Posts Feed Stream */}
          <div className="space-y-6">
            <AnimatePresence>
              {posts.map((post) => {
                const userId = user?.id || "anon";
                const hasLiked = Array.isArray(post.likedBy) && post.likedBy.includes(userId);
                return (
                  <motion.div 
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-xl space-y-4 text-left relative overflow-hidden"
                  >
                    {/* Post Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-full flex items-center justify-center font-black text-sm uppercase">
                          {post.authorName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">{post.authorName}</span>
                            <span className="px-2.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border bg-gold/5 text-gold border-gold/20">{post.authorRole}</span>
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono font-bold mt-0.5 block">{post.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3">
                      <p className="text-xs text-gray-300 font-bold leading-relaxed whitespace-pre-wrap">{post.text}</p>
                      {post.imageUrl && (
                        <div className="rounded-2xl overflow-hidden border border-white/5 max-h-[300px]">
                          <img src={post.imageUrl} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Footer reaction stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart size={14} className="text-red-500" fill="currentColor" />
                        <span className="font-bold text-[11px]">{post.likes || 0} lượt thích</span>
                      </div>
                      <div className="font-bold text-[11px]">
                        {post.comments?.length || 0} bình luận
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => handleLikePost(post.id)}
                        className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all bg-white/[0.02] border border-white/5 ${
                          hasLiked ? "text-red-500 bg-red-500/5 border-red-500/20" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Heart size={14} fill={hasLiked ? "currentColor" : "none"} />
                        <span>Thích</span>
                      </button>

                      <div className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-400 bg-white/[0.02] border border-white/5">
                        <MessageSquare size={14} />
                        <span>Bình luận</span>
                      </div>
                    </div>

                    {/* Comments list box */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-3 bg-black/20 border border-white/5 rounded-2xl p-4 mt-2">
                        {post.comments.map((cmt: any) => (
                          <div key={cmt.id} className="text-xs border-b border-white/5 last:border-none pb-2 last:pb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-white text-[11px]">{cmt.authorName}</span>
                              <span className="text-[7px] font-bold bg-white/5 text-gray-400 border border-white/10 px-1 py-0.5 rounded uppercase">{cmt.authorRole}</span>
                              <span className="text-[8px] text-gray-600 font-mono ml-auto">{cmt.timestamp}</span>
                            </div>
                            <p className="text-gray-400 font-bold pl-1">{cmt.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input box to add comment */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        placeholder="Viết bình luận của bạn..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(post.id);
                        }}
                        className="flex-grow h-9 bg-black/20 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-gold/50 transition-all font-bold"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="h-9 w-9 rounded-xl bg-gold hover:bg-gold-hover text-sidebar flex items-center justify-center transition-colors"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {posts.length === 0 && (
              <div className="h-48 rounded-3xl border border-white/5 bg-sidebar/50 flex flex-col items-center justify-center text-center p-6">
                <MessageSquare size={40} className="text-gray-600 mb-2" />
                <h4 className="text-white font-black uppercase tracking-tight text-xs">Chưa có bài viết nào</h4>
                <p className="text-[10px] text-gray-500 mt-1">Hãy đăng bài chia sẻ đầu tiên trên Bảng tin nội bộ nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Online Members & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick stats and rankings */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <TrendingUp size={14} className="text-gold" /> Hoạt động nổi bật
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Tổng lượt tương tác</span>
                <span className="text-xs font-black font-mono text-white">45 Lượt</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Thành viên năng nổ</span>
                <span className="text-xs font-black text-gold">Trần Quản lý CV</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold uppercase">Phòng ban sôi nổi</span>
                <span className="text-xs font-black text-white">Ban Công Việc</span>
              </div>
            </div>
          </div>

          {/* Quick links to actions */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-xl space-y-4 text-center">
            <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Bookmark size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Kỷ Niệm AQ MEDIA</h4>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Nơi lưu trữ những dấu mốc quan trọng và kỷ niệm đáng nhớ cùng công ty.</p>
            </div>
            <button 
              onClick={() => router.push("/admin")}
              className="w-full h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Về Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
