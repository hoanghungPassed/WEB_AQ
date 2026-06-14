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
      // VÁ LỖ HỔNG: Nếu offline thì loại bỏ khỏi danh sách ngay lập tức
      if (data.isOnline === false) {
        setChatUsers(prev => prev.filter(u => u.id !== data.userId && u._id !== data.userId));
      } else {
        setChatUsers(prev => prev.map(u =>
          (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline, lastActive: data.lastActive } : u
        ));
      }

      try {
        const storedUsers = localStorage.getItem("global_users");
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          const updated = parsed.map((u: any) =>
            (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline, lastActive: data.lastActive } : u
          );
          localStorage.setItem("global_users", JSON.stringify(updated));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) {}

      try {
        mutate(
          (key: any) => typeof key === "string" && key.startsWith("/api/admin/users"),
          (currentData: any) => {
            if (!currentData) return currentData;
            const users = currentData.users || currentData.data || (Array.isArray(currentData) ? currentData : null);
            if (!users) return currentData;

            const updatedUsers = users.map((u: any) =>
              (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline, lastActive: data.lastActive } : u
            );

            if (Array.isArray(currentData)) return updatedUsers;
            return {
              ...currentData,
              data: updatedUsers,
              users: updatedUsers
            };
          },
          { revalidate: false }
        );
      } catch (mutateErr) {}
    });

    // 5. Subscribe to System channel for status changes
    const systemChannel = pusher.subscribe("system");

    // Phase 1: online status synchronization
    systemChannel.bind("user-status-changed", (data: any) => {
      // VÁ LỖ HỔNG: Nếu offline thì loại bỏ khỏi danh sách ngay lập tức (KHÔNG GỌI API LẠI)
      if (data.isOnline === false) {
        setChatUsers(prev => prev.filter(u => u.id !== data.userId && u._id !== data.userId));
      } else {
        setChatUsers(prev => {
          const exists = prev.some(u => u.id === data.userId || u._id === data.userId);
          if (data.isOnline) {
            if (exists) {
              return prev.map(u => (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: true } : u);
            } else {
              let newUser = { id: data.userId, _id: data.userId, isOnline: true, name: data.username || "Nhân viên", username: data.username || "user", role: "05", avatar: "" };
              try {
                const stored = localStorage.getItem("global_users");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  const found = parsed.find((u: any) => u.id === data.userId || u._id === data.userId);
                  if (found) newUser = { ...found, isOnline: true };
                }
              } catch (e) {}
              return [newUser, ...prev];
            }
          }
          return prev;
        });
      }

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

      // Sync local SWR query cache without network revalidation
      try {
        mutate(
          (key: any) => typeof key === "string" && key.startsWith("/api/admin/users"),
          (currentData: any) => {
            if (!currentData) return currentData;
            const users = currentData.users || currentData.data || (Array.isArray(currentData) ? currentData : null);
            if (!users) return currentData;

            const updatedUsers = users.map((u: any) =>
              (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline } : u
            );

            if (Array.isArray(currentData)) return updatedUsers;
            return {
              ...currentData,
              data: updatedUsers,
              users: updatedUsers
            };
          },
          { revalidate: false }
        );
      } catch (mutateErr) {}
    });

    // Phase 2: task completion updates
    systemChannel.bind("task-updated", (data: any) => {
      const roleUpper = String(user.role || "").toUpperCase();
      const isAdminOrManager = roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ";
      if (isAdminOrManager) {
        mutate((key: any) => typeof key === "string" && key.includes("/api/admin/tasks"));
      }
    });

    return () => {
      pusher.unsubscribe("company-chat");
      pusher.unsubscribe(`private-chat-${user.id || user._id}`);
      pusher.unsubscribe("newsfeed");
      pusher.unsubscribe("system-users");
      pusher.unsubscribe("system");
    };
  }, [user, router, setChatUsers, setCompanyMessages, setPrivateMessages, setUnreadCount, setRoleUpdateNotif, setRealtimeToast, playChatChime, scrollToBottom]);

  return null;
}
