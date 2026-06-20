export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { paginate } from "@/lib/pagination";

// Lấy danh sách nhân sự (Hỗ trợ lọc online, phân trang)
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Automatically sweep stale online statuses (inactive for > 5 mins)
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await User.updateMany(
        { isOnline: true, lastActive: { $lt: fiveMinutesAgo } },
        { $set: { isOnline: false } }
      );
    } catch (_) {}
    
    const role = req.headers.get("x-user-role");
    if (!role) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const statusParam = searchParams.get("status");
    const roleParam = searchParams.get("role");
    const searchParam = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "role";
    const sortOrder = (searchParams.get("sortOrder") || "asc") as "asc" | "desc";

    const filter: any = {};
    
    // Status Filter (Online state uses dynamic time calculations)
    if (statusParam === "online") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      filter.lastActive = { $gte: fiveMinutesAgo };
      filter.status = "ACTIVE";
    } else if (statusParam === "PENDING") {
      filter.status = "PENDING";
    } else if (statusParam === "ACTIVE_OR_LOCKED") {
      filter.status = { $in: ["ACTIVE", "LOCKED"] };
    } else if (statusParam && statusParam !== "ALL") {
      filter.status = statusParam;
    }

    // Role Filter
    if (roleParam && roleParam !== "ALL") {
      filter.role = roleParam;
    }

    // Search Query (Matching Name or Username case-insensitively)
    if (searchParam) {
      filter.$or = [
        { name: { $regex: searchParam, $options: "i" } },
        { username: { $regex: searchParam, $options: "i" } }
      ];
    }

    if (!searchParams.has("page") && !searchParams.has("limit") && searchParams.get("all") !== "true") {
      const users = await User.find(filter).select("_id name username avatar role isOnline status").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).lean();
      const mappedUsers = users.map((u: any) => {
        const userObj = { ...u };
        delete userObj.password;
        userObj.isOnline = u.isOnline;
        userObj.id = userObj._id.toString();
        return userObj;
      });
      return NextResponse.json({ success: true, data: mappedUsers, users: mappedUsers });
    }

    const query = User.find(filter).select("_id name username avatar role isOnline status").lean();
    const result = await paginate(query, page, limit, sortBy, sortOrder);

    // Add dynamic isOnline and format mapped response
    const mappedData = result.data.map((u: any) => {
      const userObj = { ...u };
      delete userObj.password;
      userObj.isOnline = u.isOnline;
      userObj.id = userObj._id.toString();
      return userObj;
    });

    return NextResponse.json({
      success: true,
      data: mappedData,
      pagination: result.pagination
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}

// Thêm nhân sự mới
import { CreateUserSchema, sanitizeXSS } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
   await dbConnect();
   
   const userId = req.headers.get("x-user-id");
   const role = req.headers.get("x-user-role");

   const hasPermission = await checkPermission(role || "", 3, ["all", "staff", "team_tasks"]);
   if (!hasPermission) {
     await logAuditTrail(userId || "unknown", "UNAUTHORIZED_CREATE_USER", "users", {}, req);
     return NextResponse.json({ error: "Không có quyền tạo nhân sự" }, { status: 403 });
   }

   const body = await req.json();

   // Validate body using Zod schema
   const parsed = CreateUserSchema.safeParse(body);
   if (!parsed.success) {
     return NextResponse.json(
       { 
         error: "Validation failed",
         details: parsed.error.issues.map(e => ({
           field: e.path.join("."),
           message: e.message
         }))
       },
       { status: 400 }
     );
   }

   const data = parsed.data;

   // Sanitize string inputs to prevent XSS attacks
   data.name = sanitizeXSS(data.name);
   if (data.address) data.address = sanitizeXSS(data.address);
   if (data.phone) data.phone = sanitizeXSS(data.phone);

   // Kiểm tra username đã tồn tại chưa
   const existing = await User.findOne({ username: data.username });
   if (existing) {
   return NextResponse.json({ error:"Username đã tồn tại" }, { status: 400 });
   }

   // Hash mật khẩu
   let hashedPassword = "";
   if (data.password) {
     hashedPassword = await hashPassword(data.password);
   } else {
     return NextResponse.json({ error: "Vui lòng cung cấp mật khẩu" }, { status: 400 });
   }

   const newUser = new User({
     ...data,
     password: hashedPassword
   });
   await newUser.save();

   const userObj = newUser.toObject();
   delete (userObj as any).password;

   try {
     const { Log } = await import('@/models/Log');
     await Log.create({
       user: "System",
       role: role === "01" ? "ADMIN" : "QL NHÂN SỰ",
       action: `Thêm nhân sự mới: ${data.name} (${data.username})`,
       type: "SUCCESS",
       timestamp: new Date().toLocaleString("vi-VN")
     });
   } catch (logErr) {
     console.error("Log error:", logErr);
   }

   await logAuditTrail(userId || "system", "CREATE_USER_SUCCESS", "users", { name: data.name, username: data.username, role: data.role }, req);

   return NextResponse.json({ 
     message: "Tạo nhân viên thành công", 
     user: userObj 
   }, { status: 201 });
  } catch (error: unknown) {
     const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
  console.error("Create user error:", error);
  return NextResponse.json({ error:"Lỗi máy chủ: " + errorMessage }, { status: 500 });
  }
}
