import React from "react";

export default function AdminDashboard() {
  return (
    <div className="flex h-[calc(100vh-160px)] items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gold animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Welcome to AQ MEDIA Admin Dashboard
        </h1>
        <p className="mt-4 text-gray-400 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          Hệ thống quản lý chuyên nghiệp cho doanh nghiệp của bạn.
        </p>
      </div>
    </div>
  );
}
