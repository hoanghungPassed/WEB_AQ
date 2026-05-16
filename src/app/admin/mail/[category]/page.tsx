"use client";

import React, { useState, useEffect } from "react";
import MailManagement from "@/components/admin/MailManagement";
import { useParams } from "next/navigation";

export default function MailCategoryPage() {
  const params = useParams();
  const category = params.category as string;
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const getType = () => {
    switch (category) {
      case "root": return "ROOT";
      case "satellite": return "SATELLITE";
      case "monetized": return "MONETIZED";
      default: return "ALL";
    }
  };

  return (
    <div className="h-full">
      <MailManagement type={getType()} user={user} />
    </div>
  );
}
