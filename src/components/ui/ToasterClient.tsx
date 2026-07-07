"use client";
import { Toaster as HotToaster } from "react-hot-toast";

export default function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        className: "rounded-xl shadow-2xl text-base font-medium px-6 py-4 bg-[#161616] text-white border border-gold/20 font-sans",
        style: {
          borderRadius: "12px",
          background: "#161616",
          color: "#fff",
          border: "1px solid rgba(212, 163, 89, 0.2)",
          fontSize: "16px",
          fontWeight: "500",
          padding: "16px 24px",
          maxWidth: "500px",
        },
        success: {
          duration: 3000,
          style: {
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }
        },
        error: {
          duration: 5000,
          style: {
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }
        },
      }}
    />
  );
}
