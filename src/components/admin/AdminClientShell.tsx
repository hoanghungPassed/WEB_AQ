import React from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AdminLayoutClient user={user}>
      {children}
    </AdminLayoutClient>
  );
}
