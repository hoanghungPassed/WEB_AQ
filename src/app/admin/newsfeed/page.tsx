"use client";

import React, { useState, useEffect, useRef } from "react";
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
  TrendingUp,
  Bookmark,
  CornerDownRight,
  Pin,
  Trash2
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
  
  // Threaded Comments States
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Set up notifications trigger
  const triggerNotification = ({ id, title, message, postId, targetUsername }: any) => {
    if (!targetUsername || !user) return;
    if (String(targetUsername).toLowerCase() === String(user?.username || "").toLowerCase()) return;

    const stored = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
    const newNotif = {
      id,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: "NEWSFEED",
      postId,
      targetUsername,
      read: false
    };

    const updated = [newNotif, ...stored];
    localStorage.setItem("admin_notifications", JSON.stringify(updated));
    localStorage.setItem("request_trigger", Date.now().toString());
    window.dispatchEvent(new Event("storage"));
  };

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
          authorUsername: "01",
          text: "Chào mừng toàn thể anh chị em đến với hệ thống quản trị AQ MEDIA phiên bản nâng cấp hoàn hảo! Chúc cả nhà một tuần làm việc hiệu suất bùng nổ, vượt chỉ tiêu KPI đã đề ra! 🚀🔥",
          imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60",
          likes: 12,
          likedBy: [],
          comments: [
            {
              id: "cmt-1",
              authorName: "Trần Quản Lý CV",
              authorRole: "QL CÔNG VIỆC",
              authorUsername: "02",
              text: "Phiên bản mới đẹp xuất sắc sếp ơi! Hệ thống mượt mà quá! 😍",
              timestamp: "10 phút trước",
              replies: [
                {
                  id: "rep-1",
                  authorName: "Nguyễn Admin",
                  authorRole: "ADMIN",
                  authorUsername: "01",
                  text: "Cảm ơn em nhé, cùng cố gắng đưa AQ Media phát triển hơn nữa nhé! 🙌",
                  timestamp: "5 phút trước"
                }
              ]
            }
          ],
          timestamp: "1 giờ trước"
        },
        {
          id: "post-2",
          authorName: "Trần Quản Lý CV",
          authorRole: "QL CÔNG VIỆC",
          authorUsername: "02",
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

  // Handle post highlight scroll trigger
  useEffect(() => {
    if ((posts || []).length > 0) {
      const targetPostId = localStorage.getItem("highlighted_post_id");
      if (targetPostId) {
        localStorage.removeItem("highlighted_post_id");
        setTimeout(() => {
          const element = document.getElementById(targetPostId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-4", "ring-gold", "shadow-[0_0_50px_rgba(212,175,55,0.7)]");
            
            setTimeout(() => {
              element.classList.remove("ring-4", "ring-gold", "shadow-[0_0_50px_rgba(212,175,55,0.7)]");
            }, 4000);
          }
        }, 600);
      }
    }
  }, [posts]);

  const syncPosts = (updatedList: any[]) => {
    localStorage.setItem("global_newsfeed_posts", JSON.stringify(updatedList));
    localStorage.setItem("newsfeed_trigger", Date.now().toString());
    window.dispatchEvent(new Event("storage"));

    // Sync trigger to DB fallback
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_newsfeed_posts: JSON.stringify(updatedList) })
    }).catch(err => console.error("Newsfeed sync error:", err));
  };

  const handleCreatePost = () => {
    if (!newPostText.trim() && !selectedMockImage) return;
    
    const newPost = {
      id: `post_${Date.now()}`,
      authorName: user?.name || "Anonymous",
      authorRole: user?.role === "01" ? "ADMIN" : user?.role === "02" ? "QL CÔNG VIỆC" : user?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN",
      authorUsername: user?.username || "04",
      text: newPostText,
      imageUrl: selectedMockImage,
      likes: 0,
      likedBy: [],
      comments: [],
      timestamp: "Vừa xong"
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    syncPosts(updated);
    
    setNewPostText("");
    setSelectedMockImage(null);
    setShowImagePresets(false);

    setSuccessToast("Đăng bài viết thành công!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleLikePost = (postId: string) => {
    const updated = (posts || []).map(p => {
      if (p.id === postId) {
        const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
        const userId = user?.id || "anon";
        const hasLiked = likedBy.includes(userId);
        
        let newLikedBy;
        let newLikes = p.likes || 0;
        if (hasLiked) {
          newLikedBy = (likedBy || []).filter((id: string) => id !== userId);
          newLikes = Math.max(0, newLikes - 1);
        } else {
          newLikedBy = [...likedBy, userId];
          newLikes += 1;

          // Trigger notification to the post author
          if (p.authorUsername && p.authorUsername !== user?.username) {
            triggerNotification({
              id: `newsfeed-like-${Date.now()}`,
              title: "Tương tác Bảng tin",
              message: `${user?.name || "Một người dùng"} đã thích bài viết của bạn.`,
              postId: p.id,
              targetUsername: p.authorUsername
            });
          }
        }

        return { ...p, likes: newLikes, likedBy: newLikedBy };
      }
      return p;
    });

    setPosts(updated);
    syncPosts(updated);
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId] || "";
    if (!text.trim()) return;

    const updated = (posts || []).map(p => {
      if (p.id === postId) {
        const comments = Array.isArray(p.comments) ? p.comments : [];
        const newCmt = {
          id: `cmt_${Date.now()}`,
          authorName: user?.name || "Anonymous",
          authorRole: user?.role === "01" ? "ADMIN" : user?.role === "02" ? "QL CÔNG VIỆC" : user?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN",
          authorUsername: user?.username || "04",
          text: text,
          timestamp: "Vừa xong",
          replies: []
        };

        // Trigger notification to the post author
        if (p.authorUsername && p.authorUsername !== user?.username) {
          triggerNotification({
            id: `newsfeed-cmt-${Date.now()}`,
            title: "Bình luận Bảng tin",
            message: `${user?.name || "Một người dùng"} đã bình luận bài viết của bạn: "${text.slice(0, 30)}..."`,
            postId: p.id,
            targetUsername: p.authorUsername
          });
        }

        return { ...p, comments: [...comments, newCmt] };
      }
      return p;
    });

    setPosts(updated);
    syncPosts(updated);
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    setSuccessToast("Đã thêm bình luận!");
    setTimeout(() => setSuccessToast(null), 2000);
  };

  const handleAddReply = (postId: string, commentId: string) => {
    const text = replyInputs[commentId] || "";
    if (!text.trim()) return;

    const updated = (posts || []).map(p => {
      if (p.id === postId) {
        const comments = (p.comments || []).map((cmt: any) => {
          if (cmt.id === commentId) {
            const replies = Array.isArray(cmt.replies) ? cmt.replies : [];
            const newReply = {
              id: `reply_${Date.now()}`,
              authorName: user?.name || "Anonymous",
              authorRole: user?.role === "01" ? "ADMIN" : user?.role === "02" ? "QL CÔNG VIỆC" : user?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN",
              authorUsername: user?.username || "04",
              text: text,
              timestamp: "Vừa xong"
            };

            // Trigger notification to original comment author
            if (cmt.authorUsername && cmt.authorUsername !== user?.username) {
              triggerNotification({
                id: `newsfeed-reply-${Date.now()}`,
                title: "Phản hồi Bảng tin",
                message: `${user?.name || "Một người dùng"} đã trả lời bình luận của bạn: "${text.slice(0, 30)}..."`,
                postId: p.id,
                targetUsername: cmt.authorUsername
              });
            }

            return { ...cmt, replies: [...replies, newReply] };
          }
          return cmt;
        });
        return { ...p, comments };
      }
      return p;
    });

    setPosts(updated);
    syncPosts(updated);
    setReplyInputs(prev => ({ ...prev, [commentId]: "" }));
    setActiveReplyId(null);
    setSuccessToast("Đã gửi phản hồi!");
    setTimeout(() => setSuccessToast(null), 2000);
  };

  const handleTogglePinPost = (postId: string) => {
    const updated = (posts || []).map(p => {
      if (p.id === postId) {
        const nextPinned = !p.isPinned;
        setSuccessToast(nextPinned ? "Đã ghim bài viết lên đầu trang!" : "Đã bỏ ghim bài viết!");
        setTimeout(() => setSuccessToast(null), 2000);
        return { ...p, isPinned: nextPinned };
      }
      return p;
    });
    setPosts(updated);
    syncPosts(updated);
  };

  const handleDeletePost = (postId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
      const updated = (posts || []).filter(p => p.id !== postId);
      setPosts(updated);
      syncPosts(updated);
      setSuccessToast("Đã xóa bài viết thành công!");
      setTimeout(() => setSuccessToast(null), 2000);
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
              setSuccessToast("Đã sao chép và dán ảnh thành công!");
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
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] bg-green-500 text-gray-900 dark:text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider border border-gray-300 dark:border-white/10"
          >
            <Check size={16} /> {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={() => router.push("/admin")}
            className="h-9 w-9 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl flex items-center justify-center border border-gray-300 dark:border-white/10 transition-all hover:scale-105"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tighter uppercase">
              Bảng Tin Nội Bộ
            </h1>
            <p className="text-gray-500 font-medium text-[10px]">Mạng xã hội nội bộ dành cho thành viên AQ MEDIA</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <span className="bg-gold/10 text-gold border border-gold/30 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            {(posts || []).length} BÀI ĐĂNG
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
            className={`bg-white dark:bg-sidebar border rounded-2xl p-4 shadow-lg relative overflow-hidden transition-all duration-300 ${
              isDragging ? "border-gold bg-gold/5 scale-[1.01]" : "border-border-custom"
            }`}
          >
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Send size={14} className="text-gold" /> Tạo bài viết mới
            </h3>

            <textarea
              placeholder={`Chào ${user?.name || "bạn"}, hôm nay bạn thế nào? Ctrl+V để dán hoặc kéo thả ảnh...`}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              onPaste={handlePaste}
              className="w-full h-24 bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl p-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gold/50 transition-all resize-none custom-scrollbar font-bold"
            />

            {/* Selected Preset Image Preview */}
            {selectedMockImage && (
              <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 group h-36">
                <img src={selectedMockImage} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedMockImage(null)}
                  className="absolute top-2 right-2 h-8 w-8 bg-black/70 rounded-full flex items-center justify-center text-gray-900 dark:text-white hover:bg-red-500 transition-colors shadow-lg"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-white/5 pt-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowImagePresets(!showImagePresets)}
                  className={`h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    showImagePresets ? "bg-gold/15 text-gold border-gold/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  <ImageIcon size={14} /> Chọn ảnh mẫu
                </button>
              </div>

              <button 
                onClick={handleCreatePost}
                disabled={!newPostText.trim() && !selectedMockImage}
                className="h-8 px-5 bg-gold hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed text-sidebar rounded-lg font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-gold/20"
              >
                Đăng bài
              </button>
            </div>

            {/* Presets Grid */}
            {showImagePresets && (
              <div className="mt-4 p-4 bg-black/30 border border-gray-200 dark:border-white/5 rounded-2xl space-y-3">
                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <Info size={12} className="text-gold" /> Chọn ảnh minh họa:
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
                      className="cursor-pointer h-16 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 hover:border-gold transition-all relative group"
                    >
                      <img src={preset.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="text-[9px] text-gray-900 dark:text-white font-black uppercase tracking-wider">{preset.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Posts Feed Stream */}
          <div className="space-y-4">
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
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-4 shadow-lg space-y-3 text-left relative transition-all duration-500 overflow-hidden"
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gold/15 text-gold border border-gold/20 rounded-full flex items-center justify-center font-black text-xs uppercase">
                            {post.authorName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900 dark:text-white">{post.authorName}</span>
                              <span className="px-2 py-0.5 rounded text-[7px] font-black tracking-widest uppercase border bg-gold/5 text-gold border-gold/20">{post.authorRole}</span>
                              {post.isPinned && (
                                <span className="px-2 py-0.5 rounded text-[7px] font-black tracking-widest uppercase bg-gold text-sidebar flex items-center gap-0.5">
                                  <Pin size={8} className="fill-current" /> ĐÃ GHIM
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono font-bold mt-0.5 block">{post.timestamp}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleTogglePinPost(post.id)}
                            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all ${
                              post.isPinned 
                                ? "bg-gold/20 text-gold border-gold/30 animate-pulse" 
                                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white"
                            }`}
                            title={post.isPinned ? "Bỏ ghim bài viết" : "Ghim bài viết"}
                          >
                            <Pin size={12} className={post.isPinned ? "rotate-45" : ""} />
                          </button>

                          {(post.authorUsername === user?.username || user?.role === "01" || user?.role === "02") && (
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="h-8 w-8 bg-gray-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:border-red-500/20 rounded-lg flex items-center justify-center transition-all"
                              title="Xóa bài viết"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed whitespace-pre-wrap">{post.text}</p>
                      {post.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 max-h-[280px]">
                          <img src={post.imageUrl} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Footer reaction stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/5 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart size={14} className="text-red-500" fill="currentColor" />
                        <span className="font-bold text-[11px]">{post.likes || 0} lượt thích</span>
                      </div>
                      <div className="font-bold text-[11px]">
                        {post.comments?.length || 0} bình luận
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/5">
                      <button 
                        onClick={() => handleLikePost(post.id)}
                        className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 ${
                          hasLiked ? "text-red-500 bg-red-500/5 border-red-500/20" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white"
                        }`}
                      >
                        <Heart size={14} fill={hasLiked ? "currentColor" : "none"} />
                        <span>Thích</span>
                      </button>

                      <div className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                        <MessageSquare size={14} />
                        <span>Bình luận</span>
                      </div>
                    </div>

                    {/* Threaded Nested Comments list box */}
                    {post.comments && (post.comments || []).length > 0 && (
                      <div className="space-y-3 bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-3 mt-1">
                        {(post.comments || []).map((cmt: any) => (
                          <div key={cmt.id} className="space-y-2 border-b border-gray-200 dark:border-white/5 last:border-none pb-3 last:pb-0">
                            {/* Main Comment */}
                            <div className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-black text-gray-900 dark:text-white text-[11px]">{cmt.authorName}</span>
                                <span className="text-[7px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/10 px-1 py-0.5 rounded uppercase">{cmt.authorRole}</span>
                                <span className="text-[8px] text-gray-600 font-mono ml-auto">{cmt.timestamp}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 font-bold pl-1">{cmt.text}</p>
                              
                              {/* Reply button link */}
                              <div className="mt-1.5 pl-1 flex gap-4">
                                <button 
                                  onClick={() => {
                                    setActiveReplyId(activeReplyId === cmt.id ? null : cmt.id);
                                    setReplyInputs(prev => ({ ...prev, [cmt.id]: "" }));
                                  }}
                                  className="text-[9px] font-black text-gold uppercase tracking-wider hover:underline"
                                >
                                  Trả lời
                                </button>
                              </div>
                            </div>

                            {/* Nested Replies Rendering */}
                            {cmt.replies && (cmt.replies || []).length > 0 && (
                              <div className="ml-6 pl-4 border-l border-gray-300 dark:border-white/10 space-y-2 mt-2">
                                {(cmt.replies || []).map((reply: any) => (
                                  <div key={reply.id} className="text-[11px]">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <CornerDownRight size={10} className="text-gold" />
                                      <span className="font-black text-gray-900 dark:text-white">{reply.authorName}</span>
                                      <span className="text-[6px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/10 px-1 rounded uppercase">{reply.authorRole}</span>
                                      <span className="text-[8px] text-gray-600 font-mono ml-auto">{reply.timestamp}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium pl-4">{reply.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Inline Reply Input Box */}
                            {activeReplyId === cmt.id && (
                              <div className="ml-6 pl-4 border-l border-gray-300 dark:border-white/10 flex items-center gap-2 mt-2">
                                <input 
                                  placeholder={`Phản hồi ${cmt.authorName}...`}
                                  value={replyInputs[cmt.id] || ""}
                                  onChange={(e) => setReplyInputs({ ...replyInputs, [cmt.id]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddReply(post.id, cmt.id);
                                  }}
                                  className="flex-grow h-8 bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-3 text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-gold/50 transition-all font-bold"
                                />
                                <button 
                                  onClick={() => handleAddReply(post.id, cmt.id)}
                                  className="h-8 px-3 bg-gold hover:bg-gold-hover text-sidebar rounded-lg flex items-center justify-center font-black text-[10px] uppercase tracking-wider transition-colors"
                                >
                                  Gửi
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/5">
                      <input
                        placeholder="Viết bình luận..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(post.id);
                        }}
                        className="flex-grow h-8 bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-gold/50 transition-all font-bold"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="h-8 w-8 rounded-lg bg-gold hover:bg-gold-hover text-sidebar flex items-center justify-center transition-colors"
                      >
                        <Send size={11} />
                      </button>
                    </div>
                  </motion.div>
                );
              });
              })()}
            </AnimatePresence>

            {(posts || []).length === 0 && (
              <div className="h-40 rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-sidebar/50 flex flex-col items-center justify-center text-center p-4">
                <MessageSquare size={32} className="text-gray-600 mb-2" />
                <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-tight text-[11px]">Chưa có bài viết nào</h4>
                <p className="text-[9px] text-gray-500 mt-1">Hãy đăng bài chia sẻ đầu tiên trên Bảng tin nội bộ nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Profile Card & Quick Stats */}
        <div className="lg:col-span-4 space-y-4 hidden lg:block">
          {/* User profile details */}
          <div className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-4 shadow-lg relative overflow-hidden group text-center">
            <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
            
            <div className="relative mt-6 flex flex-col items-center">
              <div className="h-14 w-14 bg-gold/10 border-2 border-gold text-gold rounded-full flex items-center justify-center font-black text-lg uppercase shadow-lg shadow-gold/10">
                {user?.name?.charAt(0) || "U"}
              </div>
              
              <h3 className="text-sm font-black text-gray-900 dark:text-white mt-3">{user?.name || "Người dùng"}</h3>
              <p className="text-[8px] font-black tracking-widest uppercase text-gold bg-gold/5 border border-gold/20 px-2 py-0.5 rounded-full mt-1">
                {getRoleLabel(user?.role)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-white/5 mt-4 pt-4 text-left">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Tài khoản</span>
                <span className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 mt-0.5 block truncate">{user?.username || "N/A"}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Mã số</span>
                <span className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 mt-0.5 block truncate">#{user?.id || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Quick instructions & guidelines */}
          <div className="bg-white dark:bg-sidebar border border-border-custom rounded-2xl p-4 shadow-lg space-y-3">
            <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 dark:border-white/5 pb-2">
              <ShieldCheck size={12} className="text-gold" /> Quy tắc ứng xử
            </h3>
            
            <ul className="space-y-2">
              <li className="flex gap-2 items-start text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                <div className="h-1 w-1 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span>Chia sẻ thông tin tích cực, văn minh, tôn trọng đồng nghiệp.</span>
              </li>
              <li className="flex gap-2 items-start text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                <div className="h-1 w-1 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span>Không đăng nội dung nhạy cảm hoặc sai sự thật.</span>
              </li>
              <li className="flex gap-2 items-start text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                <div className="h-1 w-1 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span>Ctrl+V dán ảnh hoặc kéo thả tệp trực tiếp.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
