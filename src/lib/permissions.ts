import { NextRequest } from "next/server";
import mongoose from "mongoose";

export const ROLE_HIERARCHY = {
  "01": { name: "Admin", level: 5, canAccess: ["all"] },
  "02": { name: "Manager", level: 4, canAccess: ["tasks", "attendance", "staff", "reports"] },
  "03": { name: "Team Lead", level: 3, canAccess: ["tasks", "attendance", "team_tasks"] },
  "04": { name: "Senior Staff", level: 2, canAccess: ["tasks", "attendance"] },
  "05": { name: "Junior Staff", level: 1, canAccess: ["tasks"] },
};

export async function checkPermission(
  userRole: string,
  requiredLevel: number,
  requiredAccess: string[]
): Promise<boolean> {
  let mappedRole = userRole;
  const upper = String(userRole || "").toUpperCase();
  if (upper === "ADMIN") mappedRole = "01";
  else if (upper.includes("CÔNG VIỆC") || upper === "QLCV") mappedRole = "02";
  else if (upper.includes("NHÂN SỰ") || upper === "QLNS") mappedRole = "03";
  else if (upper === "NHÂN VIÊN" || upper === "NHÂN VIÊN CHÍNH THỨC") mappedRole = "04";
  else if (upper === "NV THỬ VIỆC" || upper === "NHÂN VIÊN THỬ VIỆC") mappedRole = "05";

  const roleInfo = ROLE_HIERARCHY[mappedRole as keyof typeof ROLE_HIERARCHY];
  
  if (!roleInfo) return false;
  if (roleInfo.level < requiredLevel) return false;
  
  return requiredAccess.some(access => 
    roleInfo.canAccess.includes("all") || 
    roleInfo.canAccess.includes(access)
  );
}

export async function logAuditTrail(
  userId: string,
  action: string,
  resource: string,
  changes: object,
  request: Request | NextRequest
) {
  try {
    const Log = (await import("@/models/Log")).Log;
    // Map both old fields (user, type, details) and new fields (userId, resource, changes, ipAddress) for maximum safety
    await Log.create({
      user: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined,
      userId,
      action,
      type: resource,
      resource,
      changes,
      details: JSON.stringify(changes),
      timestamp: new Date(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown"
    });
  } catch (err) {
    console.error("Failed to log audit trail:", err);
  }
}
