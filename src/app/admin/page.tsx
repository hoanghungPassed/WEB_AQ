import React from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import StaffDashboardClient from "@/components/staff/StaffDashboardClient";

export default async function AdminDashboardPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  // Quản lý/Admin (01, 02, 03) render AdminDashboardClient
  // Nhân viên (04, 05) render StaffDashboardClient
  const isManager = ["01", "02", "03"].includes(user.role || "");

  if (isManager) {
    return <AdminDashboardClient user={user} />;
  }

  return <StaffDashboardClient user={user} />;
}

