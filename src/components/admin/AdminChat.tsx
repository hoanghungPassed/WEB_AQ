"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Plus, FileText, Paperclip, Check, CheckCircle2, Copy, ExternalLink, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { StaffData } from "@/types/admin";
import Pusher from "pusher-js";

const TypingBubble = ({ senderName }: { senderName?: string }) => {
  return (
    <div className="flex flex-col self-start items-start max-w-[80%] animate-pulse">
      {senderName && (
        <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5 ml-1">
          {senderName}
        </span>
      )}
      <div className="bg-white/5 border border-white/0 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
        <span className="text-[10px] text-gray-400 font-bold mr-1">Đang soạn</span>
        <span className="flex items-center gap-0.5 h-3">
          <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
          <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '0.8s' }} />
          <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '0.8s' }} />
        </span>
      </div>
    </div>
  );
};

const getMessageStatus = (msg: any, currentUser: any) => {
  const msgTime = Number(msg.id?.split("_")[1]) || (msg.createdAt ? new Date(msg.createdAt).getTime() : 0);
  if (msgTime === 0) return null;

  const receiver = msg.receiver;
  const sender = msg.sender;

  if (typeof window === "undefined") return null;

  const readTimeStr = localStorage.getItem(`chat_last_read_time_${receiver}_${sender}`);
  const readTime = readTimeStr ? Number(readTimeStr) : 0;

  const receivedTimeStr = localStorage.getItem(`chat_last_received_time_${receiver}_${sender}`);
  const receivedTime = receivedTimeStr ? Number(receivedTimeStr) : 0;

  if (readTime >= msgTime) {
    return <span className="text-[9px] text-green-500 font-bold ml-1">✓✓ Đã xem</span>;
  }
  if (receivedTime >= msgTime) {
    return <span className="text-[9px] text-gray-400 text-zinc-500 font-bold ml-1">✓✓ Đã nhận</span>;
  }
  return <span className="text-[9px] text-gray-400 text-zinc-500 font-bold ml-1">✓ Đã gửi</span>;
};

interface AdminChatProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export default function AdminChat({ user, isOpen, onClose, unreadCount, setUnreadCount }: AdminChatProps) {
  const router = useRouter();
  const [chatTab, setChatTab] = useState<"COMPANY" | "PRIVATE">("COMPANY");
  const [chatMessage, setChatMessage] = useState("");
  const [selectedChatFile, setSelectedChatFile] = useState<any>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const privateFileInputRef = useRef<HTMLInputElement>(null);
  const companyMessagesEndRef = useRef<HTMLDivElement>(null);
  const privateMessagesEndRef = useRef<HTMLDivElement>(null);
  const [companyMessages, setCompanyMessages] = useState<any[]>([]);
  const [privateMessages, setPrivateMessages] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [chatSearchTerm, setChatSearchTerm] = useState("");

  const prevPrivateLengthRef = useRef(0);
  const prevCompanyLengthRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [companyTypingUsers, setCompanyTypingUsers] = useState<string[]>([]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatTab === "COMPANY") {
        companyMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        privateMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  }, [chatTab]);

  const playChatChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.error("Audio chime error:", e);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setChatMessage(val);
    if (!user) return;

    if (chatTab === "COMPANY") {
      const key = `chat_typing_company_${user?.username}`;
      localStorage.setItem(key, Date.now().toString());
    } else if (chatTab === "PRIVATE" && activeChatUser) {
      const key = `chat_typing_private_${user?.username}_${activeChatUser.username}`;
      localStorage.setItem(key, Date.now().toString());
    }
  };

  const handleMessageClick = async (partner: any) => {
    setActiveChatUser(partner);
    const partnerId = partner.id || partner._id;
    if (partnerId && user) {
      try {
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.id || user?._id || ''
          },
          body: JSON.stringify({ partnerId })
        });
        router.refresh();
      } catch (e) {}
    }
  };

  const syncRealUsersFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        const realUsers = data.users || data.data || [];
        if (realUsers.length > 0) {
          const formattedUsers = realUsers.map((u: any) => ({
            id: u.id || u._id || String(u.username),
            name: u.name,
            username: u.username,
            role: u.role,
            isOnline: u.isOnline || false,
            lastActive: u.lastActive,
            avatar: u.avatar || "",
            status: u.status || "ACTIVE"
          }));

          setChatUsers(formattedUsers.filter((u: any) => u.username !== user?.username));
          localStorage.setItem("global_users", JSON.stringify(formattedUsers));
        }
      }
    } catch (err) {
      console.error("Failed to sync real users from DB in layout:", err);
    }
  }, [user]);

  const loadChatData = useCallback(async () => {
    if (!user) return;

    try {
      const compRes = await fetch("/api/messages?isCompanyChat=true", {
        headers: { "x-user-id": user.id || user._id }
      });
      if (compRes.ok) {
        const compData = await compRes.json();
        if (compData.success) setCompanyMessages(compData.data || []);
      }

      if (activeChatUser) {
        const privRes = await fetch(`/api/messages?partnerId=${activeChatUser.id || activeChatUser._id}`, {
          headers: { "x-user-id": user.id || user._id }
        });
        if (privRes.ok) {
          const privData = await privRes.json();
          if (privData.success) setPrivateMessages(privData.data || []);
        }
      }
    } catch (err) {
      console.error("Load chat data error:", err);
    }
  }, [user, activeChatUser]);

  useEffect(() => {
    if (!user) return;
    loadChatData();
    syncRealUsersFromDB();
    const interval = setInterval(() => {
      loadChatData();
      syncRealUsersFromDB();
    }, 15000);

    const handleChatStorage = (e: StorageEvent) => {
      if (e.key === "global_company_chat" || e.key === "global_private_messages" || e.key === "global_users") {
        loadChatData();
      }
    };

    window.addEventListener("storage", handleChatStorage);
    return () => {
      window.removeEventListener("storage", handleChatStorage);
      clearInterval(interval);
    };
  }, [user, loadChatData, syncRealUsersFromDB]);

  useEffect(() => {
    if (!user) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    const chatChannel = pusher.subscribe("chat");
    chatChannel.bind("new-message", (msg: any) => {
      console.log("[AdminChat Pusher chat] Received new-message:", msg);
      if (msg.isCompanyChat) {
        setCompanyMessages(prev => {
          if (prev.some(m => m.id === msg.id || m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    });

    const personalChannel = pusher.subscribe(`user-${user.id || user._id}`);
    personalChannel.bind("new-message", (msg: any) => {
      console.log("[AdminChat Pusher personal] Received new-message:", msg);
      if (!msg.isCompanyChat) {
        setPrivateMessages(prev => {
          if (prev.some(m => m.id === msg.id || m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    });

    return () => {
      pusher.unsubscribe("chat");
      pusher.unsubscribe(`user-${user.id || user._id}`);
      pusher.disconnect();
    };
  }, [user, scrollToBottom]);

  useEffect(() => {
    if (!user) return;
    const checkTyping = () => {
      if (chatTab === "PRIVATE" && activeChatUser) {
        const key = `chat_typing_private_${activeChatUser.username}_${user?.username}`;
        const val = localStorage.getItem(key);
        if (val) {
          const diff = Date.now() - Number(val);
          setIsPartnerTyping(diff < 3000);
        } else {
          setIsPartnerTyping(false);
        }
      } else {
        setIsPartnerTyping(false);
      }

      const typingList: string[] = [];
      chatUsers.forEach((u: any) => {
        if (u.username !== user?.username) {
          const key = `chat_typing_company_${u.username}`;
          const val = localStorage.getItem(key);
          if (val && (Date.now() - Number(val)) < 3000) {
            typingList.push(u.name);
          }
        }
      });
      setCompanyTypingUsers(typingList);
    };
    const typingTimer = setInterval(checkTyping, 1000);
    return () => clearInterval(typingTimer);
  }, [user, chatTab, activeChatUser, chatUsers]);

  useEffect(() => {
    if (!isOpen || !user) return;

    localStorage.setItem(`chat_last_read_time_${user?.username}`, Date.now().toString());

    if (chatTab === "PRIVATE" && activeChatUser) {
      const partnerId = activeChatUser.id || activeChatUser._id;
      if (partnerId) {
        fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-id": user?.id || user?._id || ""
          },
          body: JSON.stringify({ partnerId })
        }).then(() => router.refresh()).catch(() => {});
      }
      localStorage.setItem(`chat_last_read_time_${user?.username}_${activeChatUser.username}`, Date.now().toString());
    }

    let unread = 0;
    const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}`);
    const lastReadTime = lastReadTimeStr ? parseInt(lastReadTimeStr) : 0;

    companyMessages.forEach((msg: any) => {
      const isMe = msg.senderUsername === user?.username || msg.senderName === (user?.name || user?.username);
      const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : (Number(msg.id?.split("_")[1]) || 0);
      if (!isMe && msgTime > lastReadTime) unread++;
    });

    privateMessages.forEach((msg: any) => {
      const isMe = msg.senderUsername === user?.username || msg.sender === user?.username;
      const isForMe = msg.receiverUsername === user?.username || msg.receiver === user?.username;
      const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : (Number(msg.id?.split("_")[1]) || 0);
      if (!isMe && isForMe) {
        const senderReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}_${msg.senderUsername || msg.sender}`);
        const senderReadTime = senderReadTimeStr ? Number(senderReadTimeStr) : 0;
        if (msgTime > senderReadTime && !msg.isRead) unread++;
      }
    });
    
    setUnreadCount(unread);
  }, [isOpen, chatTab, activeChatUser?.username, companyMessages, privateMessages, user, setUnreadCount, router]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen, chatTab, activeChatUser, scrollToBottom]);

  useEffect(() => {
    if (!user) return;
    if (isInitialLoadRef.current) {
      prevCompanyLengthRef.current = (companyMessages || []).length;
      prevPrivateLengthRef.current = (privateMessages || []).length;
      isInitialLoadRef.current = false;
      return;
    }

    if ((companyMessages || []).length > prevCompanyLengthRef.current) {
      const last = companyMessages[(companyMessages || []).length - 1];
      if (last && last.senderName !== (user?.name || user?.username)) playChatChime();
      prevCompanyLengthRef.current = (companyMessages || []).length;
    }

    if ((privateMessages || []).length > prevPrivateLengthRef.current) {
      const last = privateMessages[(privateMessages || []).length - 1];
      if (last && last.sender !== user?.username && last.receiver === user?.username) playChatChime();
      prevPrivateLengthRef.current = (privateMessages || []).length;
    }
  }, [companyMessages, privateMessages, user, playChatChime]);

  const filteredChatUsers = useMemo(() => {
    return (chatUsers || []).filter((u: any) => {
      if (!u.isOnline) return false;
      if (chatSearchTerm.trim() === "") return true;
      const term = chatSearchTerm.toLowerCase();
      return (u.name?.toLowerCase().includes(term) || u.username?.toLowerCase().includes(term));
    });
  }, [chatUsers, chatSearchTerm]);

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("Kích thước tệp tin không được vượt quá 20MB!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedChatFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: file.type,
        data: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendCompanyMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() && !selectedChatFile) return;

    const content = chatMessage || `[Tệp tin] ${selectedChatFile.name}`;
    setChatMessage("");
    setSelectedChatFile(null);
    scrollToBottom();

    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user?.id || user?._id || "" },
      body: JSON.stringify({ content, isCompanyChat: true })
    }).catch(console.error);
  };

  const handleSendPrivateMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() && !selectedChatFile) return;

    const content = chatMessage || `[Tệp tin] ${selectedChatFile.name}`;
    setChatMessage("");
    setSelectedChatFile(null);
    scrollToBottom();

    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user?.id || user?._id || "" },
      body: JSON.stringify({ content, receiverId: activeChatUser.id || activeChatUser._id, isCompanyChat: false })
    }).catch(console.error);
  };

  const getUnreadCountForUser = (senderUsername: string) => {
    if (!user) return 0;
    const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}_${senderUsername}`);
    const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;
    return privateMessages.filter(msg => msg.sender === senderUsername && msg.receiver === user?.username && (Number(msg.id.split("_")[1]) || 0) > lastReadTime).length;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed bottom-24 right-8 z-[100] w-[450px] h-[700px] max-h-[85vh] flex flex-col overflow-hidden bg-background-secondary border border-border shadow-premium rounded-[32px] backdrop-blur-3xl"
        >
          {/* Header */}
          <div className="p-6 bg-black/20 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg shadow-gold/10">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Hệ thống Chat</h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Thời gian thực</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-red-500 transition-all">
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="p-3 bg-black/10 flex gap-2">
            <button
              onClick={() => setChatTab("COMPANY")}
              className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chatTab === 'COMPANY' ? 'bg-gold text-background shadow-lg shadow-gold/20' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
            >
              Công ty
            </button>
            <button
              onClick={() => setChatTab("PRIVATE")}
              className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chatTab === 'PRIVATE' ? 'bg-gold text-background shadow-lg shadow-gold/20' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
            >
              Cá nhân
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col relative bg-zinc-950/20">
            {chatTab === "COMPANY" ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                  {companyMessages.map((msg, idx) => {
                    const isMe = msg.senderName === (user?.name || user?.username);
                    return (
                      <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                        )}
                        <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-medium shadow-lg transition-all ${isMe ? 'bg-gold text-background rounded-tr-none' : 'bg-white/5 text-white border border-white/5 rounded-tl-none'}`}>
                          {msg.content}
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="chat" className="mt-2 rounded-lg cursor-pointer" onClick={() => setActiveLightboxImage(msg.imageUrl)} />
                          )}
                        </div>
                        <span className="text-[8px] text-gray-600 font-bold mt-1 px-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    );
                  })}
                  {companyTypingUsers.length > 0 && <TypingBubble senderName={companyTypingUsers.join(", ")} />}
                  <div ref={companyMessagesEndRef} />
                </div>
                <form onSubmit={handleSendCompanyMessage} className="p-4 bg-black/40 border-t border-border flex gap-3">
                  <input
                    value={chatMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 bg-white/5 border border-white/0 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-gold/30"
                  />
                  <button type="submit" className="h-12 w-12 bg-gold text-background rounded-2xl flex items-center justify-center shadow-lg shadow-gold/20 hover:scale-105 transition-all">
                    <Send size={20} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* User List */}
                <div className="w-[140px] border-r border-border flex flex-col bg-black/10">
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input
                        placeholder="Tìm..."
                        value={chatSearchTerm}
                        onChange={(e) => setChatSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/0 rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                    {filteredChatUsers.map((u: any) => {
                      const unread = getUnreadCountForUser(u.username);
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleMessageClick(u)}
                          className={`w-full p-2.5 rounded-xl flex flex-col gap-1 transition-all relative ${activeChatUser?.username === u.username ? 'bg-gold/10 border border-gold/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                            <span className={`text-[10px] font-black truncate ${activeChatUser?.username === u.username ? 'text-gold' : 'text-zinc-400'}`}>
                              {u.name}
                            </span>
                          </div>
                          {unread > 0 && (
                            <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Private Chat Content */}
                <div className="flex-1 flex flex-col bg-zinc-950/30">
                  {activeChatUser ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth">
                        {privateMessages.map((msg, idx) => {
                          const isMe = msg.sender === user?.username || msg.senderUsername === user?.username;
                          return (
                            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`p-3.5 rounded-2xl max-w-[90%] text-sm font-medium shadow-lg transition-all ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-white border border-white/5 rounded-tl-none'}`}>
                                {msg.content}
                                {isMe && (
                                  <div className="mt-1 flex justify-end">
                                    {getMessageStatus(msg, user)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {isPartnerTyping && <TypingBubble />}
                        <div ref={privateMessagesEndRef} />
                      </div>
                      <form onSubmit={handleSendPrivateMessage} className="p-3 bg-black/40 border-t border-border flex gap-2">
                        <input
                          value={chatMessage}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder="Nhập tin nhắn..."
                          className="flex-1 bg-white/5 border border-white/0 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold/30"
                        />
                        <button type="submit" className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                          <Send size={16} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 p-10 text-center">
                      <MessageSquare size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">Chọn một người để bắt đầu trò chuyện</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {activeLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLightboxImage(null)}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-10 cursor-zoom-out"
          >
            <button className="absolute top-10 right-10 h-14 w-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={activeLightboxImage}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
