import React from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return <AdminDashboardClient user={user} />;
}
