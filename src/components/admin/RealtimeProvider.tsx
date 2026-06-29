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
  setPendingRequests?: React.Dispatch<React.SetStateAction<any[]>>;
  setIsAccessModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedAccessRequest?: React.Dispatch<React.SetStateAction<any>>;
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
  scrollToBottom,
  setPendingRequests,
  setIsAccessModalOpen,
  setSelectedAccessRequest
}: RealtimeProviderProps) {
  const router = useRouter();

  // Heartbeat chạy mỗi 60 giây để cập nhật trạng thái hoạt động (lastActive)
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/auth/me");
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    sendHeartbeat(); // Send immediately on load

    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initialize Pusher Client
    console.log("[Pusher] Initializing client key:", process.env.NEXT_PUBLIC_PUSHER_KEY, "cluster:", process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    pusher.connection.bind("state_change", (states: any) => {
      console.log(`[Pusher Connection State Change]: ${states.previous} -> ${states.current}`);
    });

    pusher.connection.bind("error", (err: any) => {
      console.error("[Pusher Connection Error]:", err);
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
    const privateChannel = pusher.subscribe(`private-chat-${user.id || user._id || user.userId}`);
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
      // Cập nhật trạng thái online/offline của user trong danh sách
      setChatUsers(prev => prev.map(u =>
        (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline, lastActive: data.lastActive } : u
      ));

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

    const roleUpper = String(user?.role || "").toUpperCase();
    const isManager = ["01", "02", "03"].includes(user?.role || "") || roleUpper === "ADMIN" || roleUpper.includes("QUẢN LÝ") || user?.username === "01";

    // 5. Subscribe to System channel for status changes (ONLY FOR MANAGERS/ADMIN)
    let systemChannel: any = null;
    if (isManager) {
      systemChannel = pusher.subscribe("system");

      // Phase 1: online status synchronization
      systemChannel.bind("user-status-changed", (data: any) => {
        // Cập nhật trạng thái online/offline của user trong danh sách
        setChatUsers(prev => {
          const exists = prev.some(u => u.id === data.userId || u._id === data.userId);
          if (exists) {
            return prev.map(u => (u.id === data.userId || u._id === data.userId) ? { ...u, isOnline: data.isOnline } : u);
          } else if (data.isOnline) {
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
          return prev;
        });

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
        const isAdminOrManager = roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC";
        if (isAdminOrManager) {
          mutate((key: any) => typeof key === "string" && key.includes("/api/admin/tasks"));
          mutate("/api/admin/mail/satellite-batches");
          if (user?.role === '01' || user?.role === '02') {
            mutate('/api/admin/stats');
            mutate('/api/admin/kpis');
          }
        }
      });

      systemChannel.bind("satellite-batches-updated", (data: any) => {
        const roleUpper = String(user.role || "").toUpperCase();
        const isAdminOrManager = roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC";
        if (isAdminOrManager) {
          mutate("/api/admin/mail/satellite-batches");
        }
      });

      systemChannel.bind("new-fine", (data: any) => {
        console.log("[Pusher system] Received new-fine event:", data);
        playChatChime();
        mutate((key: any) => typeof key === "string" && key.includes("/api/admin/fines"));
        mutate("/api/admin/stats");

        // Dispatch CustomEvent so HeaderNotifications can update bell without duplicate Pusher
        try {
          window.dispatchEvent(new CustomEvent("pusher-new-fine", { detail: data }));
        } catch (e) {}
      });

      systemChannel.bind("task-list-updated", (data: any) => {
        console.log("[Pusher system] Received task-list-updated event:", data);
        mutate((key: any) => typeof key === "string" && key.includes("/api/admin/tasks"));
      });

      // Phase 3: Bind access-request event
      systemChannel.bind("access-request", (data: any) => {
        console.log("[Pusher Event] Received access-request on 'system' channel. Payload:", data);
        const roleUpper = String(user?.role || "").toUpperCase();
        const isAdminOrManager = roleUpper === "01" || roleUpper === "02" || roleUpper === "03" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC" || roleUpper.includes("QUẢN LÝ");
        console.log("[Pusher Event] Checking auth for event notification. Role:", roleUpper, "isAdminOrManager:", isAdminOrManager);
        
        if (isAdminOrManager) {
          const newRequest = {
            id: data.id || data.notificationId || String(Date.now()),
            userId: data.userId || data.id || "",
            staffName: data.name || "Nhân viên",
            username: data.username || "",
            time: new Date(data.createdAt || Date.now()).toLocaleTimeString("vi-VN"),
            reason: data.reason || "Xin phép truy cập hệ thống",
            type: data.type || "ACCESS",
            status: "PENDING"
          };

          if (setPendingRequests) {
            setPendingRequests(prev => {
              const exists = prev.some(r => r.id === newRequest.id || (r.userId === newRequest.userId && r.type === newRequest.type && r.status === "PENDING"));
              if (exists) return prev;
              return [...prev, newRequest];
            });
          }



          // Sync pending_access_requests in localStorage
          try {
            const savedRequests = localStorage.getItem("pending_access_requests");
            const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
            if (!currentRequests.some((r: any) => r.id === newRequest.id || (r.userId === newRequest.userId && r.type === newRequest.type && r.status === "PENDING"))) {
              const updatedRequests = [...currentRequests, newRequest];
              localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));
              
              // Dispatch standard StorageEvent so that storage event listeners in other layout components are fired
              const storageEvent = new StorageEvent("storage", {
                key: "pending_access_requests",
                newValue: JSON.stringify(updatedRequests),
                storageArea: localStorage
              });
              window.dispatchEvent(storageEvent);
            }
          } catch (e) {}

          // Dispatch CustomEvent so HeaderNotifications can update bell without duplicate Pusher
          try {
            window.dispatchEvent(new CustomEvent("pusher-access-request", { detail: data }));
          } catch (e) {}

          // Play sound chime
          playChatChime();
        }
      });

      // Phase 5: Bind register-request event and dispatch to HeaderNotifications
      systemChannel.bind("register-request", (data: any) => {
        console.log("[Pusher system] Received register-request event:", data);
        playChatChime();

        // Dispatch CustomEvent so HeaderNotifications can show registration modal
        try {
          window.dispatchEvent(new CustomEvent("pusher-register-request", { detail: data }));
        } catch (e) {}
      });
    }

    // 6. Subscribe to personal channel 'user-' + user._id (FOR EVERYONE)
    const personalChannel = pusher.subscribe(`user-${user.id || user._id || user.userId}`);
    
    personalChannel.bind("new-task", (data: any) => {
      setRoleUpdateNotif({ title: data.title || "Nhiệm vụ mới", message: data.message });
      setTimeout(() => setRoleUpdateNotif(null), 5000);
      router.refresh();
      mutate("/api/admin/tasks");
      mutate("/api/admin/stats");
    });

    personalChannel.bind("new_notification", (notif: any) => {
      console.log("[Pusher personal] Received new_notification:", notif);
      try {
        window.dispatchEvent(new CustomEvent("pusher-new-notification", { detail: notif }));
      } catch (e) {}
    });

    personalChannel.bind("status-update", (data: any) => {
      router.refresh();
      mutate("/api/admin/stats");
    });

    personalChannel.bind("new-fine", (data: any) => {
      console.log("[Pusher personal] Received new-fine event:", data);
      playChatChime();
      setRoleUpdateNotif({
        title: "Báo cáo xử phạt mới",
        message: `Bạn bị phạt ${data.amount ? data.amount.toLocaleString("vi-VN") : "50.000"}đ lý do: ${data.reason || "Không hoàn thành task đúng hạn"}`
      });
      setTimeout(() => setRoleUpdateNotif(null), 8000);
      mutate((key: any) => typeof key === "string" && key.includes("/api/admin/fines"));
      mutate("/api/admin/stats");
    });

    // Securely listen to private direct messages only on this user's personal channel
    personalChannel.bind("new-message", (msg: any) => {
      console.log("[Pusher personal] Received new-message on personal channel:", msg);
      if (!msg.isCompanyChat) {
        setPrivateMessages(prev => {
          if (prev.some(m => m.id === msg.id || m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderUsername !== user.username) {
          playChatChime();
          setUnreadCount(prev => prev + 1);
        }
        scrollToBottom();
      }
    });

    // 7. Subscribe to general 'chat' channel for company chat messages (FOR EVERYONE)
    const chatChannel = pusher.subscribe("chat");
    chatChannel.bind("new-message", (msg: any) => {
      console.log("[Pusher chat] Received new-message on 'chat' channel:", msg);
      if (msg.isCompanyChat) {
        setCompanyMessages(prev => {
          if (prev.some(m => m.id === msg.id || m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderUsername !== user.username) {
          playChatChime();
          setUnreadCount(prev => prev + 1);
        }
        scrollToBottom();
      }
    });

    return () => {
      pusher.unsubscribe("company-chat");
      pusher.unsubscribe(`private-chat-${user.id || user._id || user.userId}`);
      pusher.unsubscribe("newsfeed");
      pusher.unsubscribe("system-users");
      if (isManager) {
        pusher.unsubscribe("system");
      }
      pusher.unsubscribe(`user-${user.id || user._id || user.userId}`);
      pusher.unsubscribe("chat");
    };
  }, [user, router, setChatUsers, setCompanyMessages, setPrivateMessages, setUnreadCount, setRoleUpdateNotif, setRealtimeToast, playChatChime, scrollToBottom, setPendingRequests, setIsAccessModalOpen, setSelectedAccessRequest]);

  return null;
}
