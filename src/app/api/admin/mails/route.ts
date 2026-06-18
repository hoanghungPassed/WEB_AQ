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
let cachedBatchStats: any[] = [];
let lastBatchCacheTime = 0;

export async function GET(req: NextRequest) {
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const batch = searchParams.get("batch");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
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
      query.$or = [{ batch: batch }, { batchId: batch }, { batchName: batch }];
    }

    const batchId = searchParams.get("batchId");
    if (batchId && batchId !== "ALL") {
      query.$or = [{ batch: batchId }, { batchId: batchId }, { batchName: batchId }];
    }

    // Unassigned filter
    const unassigned = searchParams.get("unassigned");
    if (unassigned === "true") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { batchId: { $exists: false } },
          { batchId: "" },
          { batchName: { $exists: false } },
          { batchName: "" }
        ]
      });
    }

    // Assignee filter
    if (assigneeId) {
      query.assigneeId = assigneeId;
    }
    const isStaffRole = userRole === "03" || userRole === "04" || userRole === "05";
    if (isStaffRole) {
      query.assigneeId = userId;
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

    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const idsArray = idsParam.split(",");
      const objectIds = idsArray.filter(id => id.length === 24);
      const numericIds = idsArray.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      const idOrConditions: any[] = [];
      if (objectIds.length > 0) idOrConditions.push({ _id: { $in: objectIds } });
      if (numericIds.length > 0) idOrConditions.push({ stt: { $in: numericIds } });
      
      if (idOrConditions.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({ $or: idOrConditions });
      }
    }

    const getModel = (t: string) => {
      if (t === "ROOT") return RootMail;
      if (t === "SATELLITE") return SatelliteMail;
      return MonetizedMail;
    };

    // Use cached batch stats if less than 30 seconds old to prevent heavy DB load
    let batchStats = cachedBatchStats;
    const now = Date.now();
    if (now - lastBatchCacheTime > 30000 || cachedBatchStats.length === 0) {
      const [rootBatches, satBatches, monBatches] = await Promise.all([
        RootMail.aggregate([
          { $group: { _id: "$batchName", count: { $sum: 1 }, type: { $first: "$type" }, createdAt: { $first: "$createdAt" } } }
        ]).catch(() => []),
        SatelliteMail.aggregate([
          { $group: { _id: "$batchName", count: { $sum: 1 }, type: { $first: "$type" }, createdAt: { $first: "$createdAt" } } }
        ]).catch(() => []),
        MonetizedMail.aggregate([
          { $group: { _id: "$batchName", count: { $sum: 1 }, type: { $first: "$type" }, createdAt: { $first: "$createdAt" } } }
        ]).catch(() => [])
      ]);

      const combined = [...rootBatches, ...satBatches, ...monBatches];
      const map = new Map<string, { count: number, type: string, createdAt: Date }>();
      
      for (const b of combined) {
        if (!b._id) continue;
        const existing = map.get(b._id);
        if (existing) {
          existing.count += b.count;
        } else {
          map.set(b._id, { count: b.count, type: b.type || "ROOT", createdAt: b.createdAt || new Date() });
        }
      }
      
      batchStats = Array.from(map.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        type: data.type,
        createdAt: data.createdAt
      }));
      cachedBatchStats = batchStats;
      cachedBatches = batchStats.map(b => b.name);
      lastBatchCacheTime = now;
    }

    let uniqueBatches = cachedBatches;
    const skip = (page - 1) * limit;

    // Paged Query for specific type
    if (type && type !== "ALL") {
      const Model = getModel(type) as any;
      const q = Model.find(query).select("-htmlBody -textBody");
      const result = await paginate(q, page, limit, sortBy, sortOrder);
      return NextResponse.json({
        ...result,
        batches: uniqueBatches,
        batchStats
      });
    }

    // Paged Query for combined (ALL) collection
    const [rootMails, satelliteMails, monetizedMails, totalRoot, totalSat, totalMon] = await Promise.all([
      RootMail.find(query).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(limit).select("-htmlBody -textBody").lean(),
      SatelliteMail.find(query).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(limit).select("-htmlBody -textBody").lean(),
      MonetizedMail.find(query).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(limit).select("-htmlBody -textBody").lean(),
      RootMail.countDocuments(query),
      SatelliteMail.countDocuments(query),
      MonetizedMail.countDocuments(query)
    ]);
    const mails: any[] = [...rootMails, ...satelliteMails, ...monetizedMails];

    // In-memory sort combined array
    mails.sort((a: any, b: any) => {
      const valA = a[sortBy] || a.createdAt;
      const valB = b[sortBy] || b.createdAt;
      return sortOrder === "asc"
        ? new Date(valA).getTime() - new Date(valB).getTime()
        : new Date(valB).getTime() - new Date(valA).getTime();
    });

    const total = totalRoot + totalSat + totalMon;
    const paginatedData = mails.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      },
      batches: uniqueBatches,
      batchStats
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
 const res = await RootMail.insertMany(rootItems, { ordered: false });
 newMails.push(...res);
 }
 if (satelliteItems.length > 0) {
 const res = await SatelliteMail.insertMany(satelliteItems, { ordered: false });
 newMails.push(...res);
 }
 if (monetizedItems.length > 0) {
 const res = await MonetizedMail.insertMany(monetizedItems, { ordered: false });
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
  if (batchId) {
    query.$or = [{ batchId }, { batch: batchId }];
  } else if (batchName) {
    query.$or = [{ batchName }, { batch: batchName }];
  }

  // Phase 2: Integrity Check - Prevent deletion if tasks are pending
  const activeTask = await (await import("@/models/Task")).Task.findOne({
    $or: [
      { batch: batchId || batchName },
      { batchName: batchId || batchName },
      { batchId: batchId || batchName }
    ],
    status: 'PENDING'
  });

  if (activeTask) {
    return NextResponse.json({ 
      error: "Không thể xóa Lô Mail này vì đang có Task PENDING. Vui lòng xử lý Task trước." 
    }, { status: 400 });
  }

  // Atomic-like parallel deletion
  const [resRoot, resSat, resMon] = await Promise.all([
    RootMail.deleteMany(query),
    SatelliteMail.deleteMany(query),
    MonetizedMail.deleteMany(query)
  ]);
  
  const deletedCount = resRoot.deletedCount + resSat.deletedCount + resMon.deletedCount;

  // Cascading deletes on Batch and Task collections
  try {
    const BatchModel = (await import("@/models/Batch")).default;
    const { Task } = await import("@/models/Task");

    const batchQuery: any = {};
    if (batchId) batchQuery._id = batchId;
    else if (batchName) batchQuery.name = batchName;

    let targetBatch = null;
    if (batchId) {
      targetBatch = await BatchModel.findById(batchId);
    } else if (batchName) {
      targetBatch = await BatchModel.findOne({ name: batchName });
    }

    await BatchModel.deleteMany(batchQuery);

    const taskQuery: any = {};
    if (targetBatch) {
      taskQuery.$or = [
        { batch: targetBatch.name },
        { batch: targetBatch._id.toString() },
        { batchName: targetBatch.name },
        { batchId: targetBatch._id.toString() }
      ];
    } else {
      const term = batchId || batchName;
      taskQuery.$or = [
        { batch: term },
        { batchName: term },
        { batchId: term }
      ];
    }
    await Task.deleteMany(taskQuery);

    // Invalidate batch cache
    cachedBatches = [];
    lastBatchCacheTime = 0;
  } catch (cascadeErr) {
    console.error("Cascading delete error:", cascadeErr);
  }

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
