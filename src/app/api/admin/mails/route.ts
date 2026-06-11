import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { RootMail } from "@/models/RootMail";
import { SatelliteMail } from "@/models/SatelliteMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { paginate } from "@/lib/pagination";

export const dynamic = "force-dynamic";

// Global cache for batches to prevent slow distinct queries on every request
let cachedBatches: string[] = [];
let lastBatchCacheTime = 0;

export async function GET(req: NextRequest) {
  try {
    let userId = req.headers.get("x-user-id");
    if (!userId) {
      const authUser = await getAuthUser();
      if (authUser) {
        userId = authUser.userId;
      }
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const batch = searchParams.get("batch");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    // Setup base filter query
    const query: any = {};
    
    // Status filter (In Satellite/Monetized it maps to workStatus; in Root it maps to verificationStatus)
    if (status && status !== "ALL") {
      if (type === "ROOT") {
        query.verificationStatus = status;
      } else {
        query.workStatus = status;
      }
    }

    // Batch filter
    if (batch && batch !== "ALL") {
      query.$or = [{ batchId: batch }, { batchName: batch }];
    }

    // Assignee filter
    if (assigneeId) {
      query.assigneeId = assigneeId;
    }

    // Text search filter
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { email: searchRegex },
        { recoveryMail: searchRegex },
        { recovery: searchRegex },
        { phone: searchRegex }
      ];
    }

    const getModel = (t: string) => {
      if (t === "ROOT") return RootMail;
      if (t === "SATELLITE") return SatelliteMail;
      return MonetizedMail;
    };

    // Use cached batches if less than 60 seconds old to prevent heavy DB load
    let uniqueBatches = cachedBatches;
    const now = Date.now();
    if (now - lastBatchCacheTime > 60000 || cachedBatches.length === 0) {
      const [distinctRoot, distinctSatellite, distinctMonetized] = await Promise.all([
        RootMail.distinct("batchName").catch(() => []),
        SatelliteMail.distinct("batchName").catch(() => []),
        MonetizedMail.distinct("batchName").catch(() => [])
      ]);
      uniqueBatches = Array.from(new Set([...distinctRoot, ...distinctSatellite, ...distinctMonetized])).filter(Boolean) as string[];
      cachedBatches = uniqueBatches;
      lastBatchCacheTime = now;
    }

    // Fallback: If no pagination requested OR all=true is specified, return full data
    if ((!searchParams.has("page") && !searchParams.has("limit")) || searchParams.get("all") === "true") {
      let mails: any[] = [];
      if (!type || type === "ALL" || type === "ROOT") {
        const rootMails = await RootMail.find(query).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });
        mails = [...mails, ...rootMails];
      }
      if (!type || type === "ALL" || type === "SATELLITE") {
        const satelliteMails = await SatelliteMail.find(query).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });
        mails = [...mails, ...satelliteMails];
      }
      if (!type || type === "ALL" || type === "MONETIZED") {
        const monetizedMails = await MonetizedMail.find(query).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });
        mails = [...mails, ...monetizedMails];
      }
      // Only sort combined array if type was "ALL" or not specified
      if (!type || type === "ALL") {
        mails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return NextResponse.json({ success: true, data: mails, batches: uniqueBatches });
    }

    // Paged Query for specific type
    if (type && type !== "ALL") {
      const Model = getModel(type) as any;
      const q = Model.find(query);
      const result = await paginate(q, page, limit, sortBy, sortOrder);
      return NextResponse.json({
        ...result,
        batches: uniqueBatches
      });
    }

    // Paged Query for combined (ALL) collection
    const rootMails = await RootMail.find(query).lean();
    const satelliteMails = await SatelliteMail.find(query).lean();
    const monetizedMails = await MonetizedMail.find(query).lean();
    const mails: any[] = [...rootMails, ...satelliteMails, ...monetizedMails];
    
    // In-memory sort combined array
    mails.sort((a: any, b: any) => {
      const valA = a[sortBy] || a.createdAt;
      const valB = b[sortBy] || b.createdAt;
      return sortOrder === "asc"
        ? new Date(valA).getTime() - new Date(valB).getTime()
        : new Date(valB).getTime() - new Date(valA).getTime();
    });

    const total = mails.length;
    const skip = (page - 1) * limit;
    const paginatedData = mails.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      },
      batches: uniqueBatches
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
  let userId = req.headers.get("x-user-id");
  let userRole = req.headers.get("x-user-role");
  if (!userId) {
    const authUser = await getAuthUser();
    if (authUser) {
      userId = authUser.userId;
      userRole = authUser.role;
    }
  }

  const hasPermission = await checkPermission(userRole || "", 4, ["all", "staff", "reports"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_IMPORT_MAILS", "mails", {}, req);
    return NextResponse.json({ error: "Không có quyền nhập lô mail" }, { status: 403 });
  }

 await dbConnect();
 const body = await req.json();
  let payload;
  // Handle 3 formats: 1) Array directly, 2) {mails: [...]} from Excel import, 3) single object
  const rawItems = Array.isArray(body) ? body : (Array.isArray(body.mails) ? body.mails : null);
  
  if (rawItems) {
  payload = rawItems.map((item: any) => ({
  email: item.email,
  password: item.password || item.pass ||"",
  recoveryMail: item.recoveryMail || item.recovery ||"",
  twoFA: item.twoFA ||"",
  phone: item.phone ||"",
  phoneLink: item.phoneLink || item.otpLink ||"",
  stt: item.stt || item.id || 0,
  type: item.type || body.type,
  status: item.status ||"LIVE",
  workStatus: item.workStatus,
  verificationStatus: item.verificationStatus,
  cccdDate: item.cccdDate,
  batch: item.batch || item.batchName || body.batchName,
  batchName: item.batchName || body.batchName,
  batchId: item.batchId,
  assignee: item.assignee,
  assigneeId: item.assigneeId,
  assignedTo: item.assignedTo,
  updatedBy: item.updatedBy,
  lastUpdated: item.lastUpdated,
  links: item.links || [],
  channelNames: item.channelNames || [],
  eligibleChannels: item.eligibleChannels || [],
  reClickDate: item.reClickDate,
  step2PendingDate: item.step2PendingDate,
  channelStatusDetail: item.channelStatusDetail,
  inviteStatus: item.inviteStatus,
  createdAt: item.createdAt || new Date()
  }));
  } else {
  payload = body;
  }

 const newMails = [];
 let items = Array.isArray(payload) ? payload : [payload];

 // Duplicate check
 const emailsToTest = items.map(i => i.email.toLowerCase());
 const [existingRoot, existingSat, existingMon] = await Promise.all([
   RootMail.find({ email: { $in: emailsToTest } }).select("email").lean(),
   SatelliteMail.find({ email: { $in: emailsToTest } }).select("email").lean(),
   MonetizedMail.find({ email: { $in: emailsToTest } }).select("email").lean()
 ]);
 const existingEmails = new Set([
   ...existingRoot.map(r => r.email.toLowerCase()),
   ...existingSat.map(r => r.email.toLowerCase()),
   ...existingMon.map(r => r.email.toLowerCase())
 ]);

 items = items.filter(i => !existingEmails.has(i.email.toLowerCase()));

 const rootItems = items.filter(i => i.type ==="ROOT");
 const satelliteItems = items.filter(i => i.type ==="SATELLITE");
 const monetizedItems = items.filter(i => i.type ==="MONETIZED");

 if (rootItems.length > 0) {
 const res = await RootMail.insertMany(rootItems);
 newMails.push(...res);
 }
 if (satelliteItems.length > 0) {
 const res = await SatelliteMail.insertMany(satelliteItems);
 newMails.push(...res);
 }
 if (monetizedItems.length > 0) {
 const res = await MonetizedMail.insertMany(monetizedItems);
 newMails.push(...res);
 }

  if (newMails.length === 0) {
    return NextResponse.json({ 
      success: true, 
      data: [], 
      message: "Không có mail mới được thêm (tất cả email đã tồn tại hoặc type không hợp lệ)",
      duplicateCount: existingEmails.size
    }, { status: 200 });
  }
 
 try {
 const { logAction } = await import('@/lib/logger');
 const count = items.length;
 await logAction("system", `Nhập lô mới: ${count} mail`, `Lô mail mới được nhập thành công.`);
 } catch (logErr) {
 console.error("Log error:", logErr);
 }

 await logAuditTrail(userId || "system", "IMPORT_MAILS_SUCCESS", "mails", { count: items.length }, req);
 
 return NextResponse.json({ success: true, data: Array.isArray(payload) ? newMails : newMails[0] }, { status: 201 });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("LỖI API POST:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function DELETE(req: NextRequest) {
  try {
  let userId = req.headers.get("x-user-id");
  let userRole = req.headers.get("x-user-role");
  if (!userId) {
    const authUser = await getAuthUser();
    if (authUser) {
      userId = authUser.userId;
      userRole = authUser.role;
    }
  }

  const hasPermission = await checkPermission(userRole || "", 4, ["all", "staff", "reports"]);
  if (!hasPermission) {
    await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_MAILS", "mails", {}, req);
    return NextResponse.json({ error: "Không có quyền xóa lô mail" }, { status: 403 });
  }

 await dbConnect();
 const { searchParams } = new URL(req.url);
 const batchId = searchParams.get('batchId');
 const batchName = searchParams.get('batchName');

 if (!batchId && !batchName) {
 return NextResponse.json({ success: false, error:"Missing batchId or batchName" }, { status: 400 });
 }

 const query: any = {};
 if (batchId) query.batchId = batchId;
 else if (batchName) query.batchName = batchName;

 const resRoot = await RootMail.deleteMany(query);
 const resSat = await SatelliteMail.deleteMany(query);
 const resMon = await MonetizedMail.deleteMany(query);
 
 const deletedCount = resRoot.deletedCount + resSat.deletedCount + resMon.deletedCount;

 try {
 const { logAction } = await import('@/lib/logger');
 await logAction("system", `Xóa lô mail: ${batchName || batchId} (${deletedCount} mail)`, `Đã xóa lô mail.`);
 } catch (logErr) {
 console.error("Log error:", logErr);
 }
 
 await logAuditTrail(userId || "system", "DELETE_MAILS_SUCCESS", "mails", { batchId, batchName, deletedCount }, req);
 
 return NextResponse.json({ success: true, deletedCount }, { status: 200 });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 console.error("LỖI API DELETE:", error);
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
