import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Phone } from "@/models/Phone";
import { User } from "@/models/User";
import { Log } from "@/models/Log";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const hasPermission = await checkPermission(userRole || "", 3, ["all", "reports", "attendance", "staff"]);
    if (!hasPermission) {
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_IMPORT_PHONES", "phones", {}, req);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();

    // Retrieve batch name and admin username from query params
    const { searchParams } = new URL(req.url);
    let batchName = searchParams.get("batch") || "";
    let username = searchParams.get("username") || "";

    const contentType = req.headers.get("content-type") || "";
    let textData = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      textData = body.textData || body.text || "";
      if (body.batch) batchName = body.batch;
      if (body.username) username = body.username;
    } else {
      textData = await req.text();
    }

    if (!batchName) {
      batchName = `Lô_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    }

    if (!textData || !textData.trim()) {
      return NextResponse.json({ success: false, error: "Dữ liệu trống hoặc không hợp lệ." }, { status: 400 });
    }

    const lines = textData.split(/\r?\n/);
    const phonesToImport: any[] = [];

    for (const line of lines) {
      // Rule 1: safety check to skip garbage/empty lines
      if (!line.trim() || !line.includes("|")) {
        continue;
      }

      const [phoneRaw, linkRaw] = line.split("|");
      const phone = (phoneRaw || "").trim();
      const link = (linkRaw || "").trim();

      if (phone) {
        phonesToImport.push({
          number: phone,
          otpLink: link,
          status: "Chưa làm",
          assigneeId: null,
          assignedTo: null,
          assignedAt: null,
          importedAt: new Date().toISOString().split("T")[0],
          batch: batchName,
          importBatch: batchName
        });
      }
    }

    if (phonesToImport.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy số điện thoại hợp lệ nào trong file." }, { status: 400 });
    }

    const numbersToImport = phonesToImport.map((p) => p.number);
    const existingPhones = await Phone.find({ number: { $in: numbersToImport } }).lean();
    const existingNumbers = new Set(existingPhones.map((p: any) => p.number));

    const uniquePayloadMap = new Map<string, any>();
    for (const p of phonesToImport) {
      if (!existingNumbers.has(p.number) && !uniquePayloadMap.has(p.number)) {
        uniquePayloadMap.set(p.number, p);
      }
    }
    const finalPayload = Array.from(uniquePayloadMap.values());

    if (finalPayload.length === 0) {
      return NextResponse.json({ success: false, error: "Tất cả SĐT trong file đều đã tồn tại hoặc trùng lặp!" }, { status: 400 });
    }

    await Phone.insertMany(finalPayload);
    const duplicates = phonesToImport.length - finalPayload.length;
    let successMsg = `Import thành công lô ${batchName}`;
    if (duplicates > 0) {
      successMsg += ` (đã bỏ qua ${duplicates} SĐT trùng)`;
    }

    if (username) {
      const adminUser = await User.findOne({ username });
      if (adminUser) {
        await Log.create({
          action: "IMPORT_PHONES",
          details: `Đã import lô SĐT: ${batchName} (${finalPayload.length} số mới)`,
          type: "SUCCESS",
          role: adminUser.role || "ADMIN",
          user: adminUser._id
        });
      }
    }

    await logAuditTrail(userId || "system", "IMPORT_PHONES_SUCCESS", "phones", { batch: batchName, importedCount: finalPayload.length }, req);
    return NextResponse.json({ success: true, message: successMsg, imported: finalPayload.length }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
