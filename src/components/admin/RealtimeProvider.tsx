"use client";

import React, { useEffect } from "react";
import Pusher from "pusher-js";
import { mutate } from "swr";
import { useRouter } from "next/navigation";

interface RealtimeProviderProps {
  user: any;
  setChatUsers: React.Dispatch<React.SetStateAction<any[]>>;
  setCompanyMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setPrivateMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setRoleUpdateNotif: React.Dispatch<React.SetStateAction<any>>;
  setRealtimeToast: React.Dispatch<React.SetStateAction<string | null>>;
  playChatChime: () => void;
  scrollToBottom: () => void;
}

export default function RealtimeProvider({
  user,
  setChatUsers,
  setCompanyMessages,
  setPrivateMessages,
  setUnreadCount,
  setRoleUpdateNotif,
  setRealtimeToast,
  playChatChime,
  scrollToBottom
}: RealtimeProviderProps) {
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // Initialize Pusher Client
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    // 1. Subscribe to Company Chat
    const companyChannel = pusher.subscribe("company-chat");
    companyChannel.bind("new-message", (msg: any) => {
      setCompanyMessages(prev => {
        if (prev.some(m => m.id === msg.id || m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (msg.senderUsername !== user.username) {
        playChatChime();
        setUnreadCount(prev => prev + 1);
      }
      scrollToBottom();
    });

    // 2. Subscribe to Private Chat
    const privateChannel = pusher.subscribe(`private-chat-${user.id || user._id}`);
    privateChannel.bind("new-message", (msg: any) => {
      setPrivateMessages(prev => {
        if (prev.some(m => m.id === msg.id || m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (msg.senderUsername !== user.username) {
        playChatChime();
        setUnreadCount(prev => prev + 1);
      }
      scrollToBottom();
    });

    // 3. Subscribe to Newsfeed (Notifications)
    const newsfeedChannel = pusher.subscribe("newsfeed");
    newsfeedChannel.bind("new-post", (post: any) => {
      setRoleUpdateNotif({ title: "Thông báo mới", message: post.title });
      setTimeout(() => setRoleUpdateNotif(null), 5000);
      router.refresh();
    });

    // 4. Subscribe to User Status Changes (Legacy channel system-users status-changed)
    const statusChannel = pusher.subscribe("system-users");
    statusChannel.bind("status-changed", (data: any) => {
      setChatUsers(prev => prev.map(u => 
        (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline, lastActive: data.lastActive } : u
      ));
    });

    // 5. Subscribe to System channel for status changes, task-updated, and new-fine (Phase 1 & Phase 2)
    const systemChannel = pusher.subscribe("system");
    
    // Phase 1: online status synchronization
    systemChannel.bind("user-status-changed", (data: any) => {
      setChatUsers(prev => prev.map(u => 
        (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline } : u
      ));

      // Sync global_users in localStorage
      try {
        const storedUsers = localStorage.getItem("global_users");
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          const updated = parsed.map((u: any) =>
            (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline } : u
          );
          localStorage.setItem("global_users", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) {}
    });

    // Phase 2: task completion updates (safe mutate, only for ADMIN/MANAGER role === '01' || role === '02')
    systemChannel.bind("task-updated", (data: any) => {
      const roleUpper = String(user.role || "").toUpperCase();
      const isAdminOrManager = roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC";
      
      if (isAdminOrManager) {
        // Safe mutate: only admins fetch layout & task lists
        mutate("/api/admin/tasks");
        mutate((key: any) => typeof key === "string" && key.includes("/api/admin/tasks"));
        mutate((key: any) => typeof key === "string" && key.includes("/api/admin/mails"));
        mutate("admin-dashboard-stats-v2");
        mutate("/api/admin/kpis");
        mutate("/api/admin/stats");
        router.refresh();
      }
    });

    // 6. Subscribe to assignee private channel for new tasks (Phase 2)
    const userChannel = pusher.subscribe(`user-${user.id || user._id}`);
    userChannel.bind("new-task", (data: any) => {
      setRealtimeToast(data.message || `Bạn nhận được công việc mới: ${data.title}`);
      setTimeout(() => setRealtimeToast(null), 5000);
      playChatChime();
      
      // Mutate local/personal task query
      mutate("/api/admin/tasks");
      mutate((key: any) => typeof key === "string" && key.includes("/api/admin/tasks"));
      router.refresh();
    });

    return () => {
      pusher.unsubscribe("company-chat");
      pusher.unsubscribe(`private-chat-${user.id || user._id}`);
      pusher.unsubscribe("newsfeed");
      pusher.unsubscribe("system-users");
      pusher.unsubscribe("system");
      pusher.unsubscribe(`user-${user.id || user._id}`);
      pusher.disconnect();
    };
  }, [user, setChatUsers, setCompanyMessages, setPrivateMessages, setUnreadCount, setRoleUpdateNotif, setRealtimeToast, playChatChime, scrollToBottom, router]);

  return null;
}
