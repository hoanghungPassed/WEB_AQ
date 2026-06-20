"use client";

import React, { useState, useEffect } from"react";
import MailManagement from"@/components/admin/MailManagement";
import { useParams } from"next/navigation";

export default function MailCategoryPage() {
 const params = useParams();
 const category = params.category as string;
 const [user, setUser] = useState<any>(null);

 useEffect(() => {
 const storedUser = sessionStorage.getItem("user");
 if (storedUser) {
 const parsedUser = JSON.parse(storedUser);
 setUser(parsedUser);
  const roleUpper = String(parsedUser.role || "").toUpperCase();
  const isEmployee = ["04", "05", "NHÂN VIÊN", "NV THỬ VIỆC"].some(r => roleUpper.includes(r));
  const isHR = ["03", "QL NHÂN SỰ", "QUẢN LÝ NHÂN SỰ"].some(r => roleUpper.includes(r));
  
  if (isEmployee && category !== "satellite") {
    window.location.href = "/admin/mail/satellite";
  } else if (isHR && category !== "satellite" && category !== "root") {
    window.location.href = "/admin/mail/satellite";
  }
 }
 }, [category]);

 const getType = () => {
 switch (category) {
 case"root": return"ROOT";
 case"satellite": return"SATELLITE";
 case"monetized": return"MONETIZED";
 default: return"ALL";
 }
 };

 return (
 <div className="h-full font-sans text-sm">
 <MailManagement type={getType()} user={user} />
 </div>
 );
}
