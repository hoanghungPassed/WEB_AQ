export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { RootMail } from "@/models/RootMail";
import { SatelliteMail } from "@/models/SatelliteMail";
import { MonetizedMail } from "@/models/MonetizedMail";
import { getAuthUser } from "@/lib/auth";
import { checkPermission, logAuditTrail } from "@/lib/permissions";

/**
 * Parses raw CSV content supporting quoted strings and escaped double quotes.
 */
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++; // Skip the next escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field.trim());
        field = "";
      } else if (char === '\n' || char === '\r') {
        row.push(field.trim());
        field = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip standard Windows line-break next char
        }
      } else {
        field += char;
      }
    }
  }
  
  // Push trailing row / field
  if (field !== "" || row.length > 0) {
    row.push(field.trim());
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
      result.push(row);
    }
  }
  
  return result;
}

/**
 * Maps standard schema properties to matching header column indexes dynamically.
 */
function normalizeHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const clean = (s: string) => s.toLowerCase().replace(/[\s_\-\.]/g, "");
  
  headers.forEach((h, idx) => {
    const c = clean(h);
    if (c === "stt" || c === "id" || c === "no") mapping["stt"] = idx;
    else if (c === "email" || c === "mail" || c === "diachimail" || c === "account") mapping["email"] = idx;
    else if (c === "password" || c === "pass" || c === "matkhau" || c === "pwd") mapping["password"] = idx;
    else if (c === "recoverymail" || c === "recovery" || c === "mailkhoiphuc" || c === "recoveryaccount") mapping["recoveryMail"] = idx;
    else if (c === "twofa" || c === "2fa" || c === "twofactor" || c === "ma2fa") mapping["twoFA"] = idx;
    else if (c === "phone" || c === "sodienthoai" || c === "sdt" || c === "tel") mapping["phone"] = idx;
    else if (c === "phonelink" || c === "otplink" || c === "linkotp" || c === "simlink") mapping["phoneLink"] = idx;
    else if (c === "type" || c === "loai" || c === "mailtype") mapping["type"] = idx;
    else if (c === "status" || c === "trangthai") mapping["status"] = idx;
    else if (c === "workstatus" || c === "trangthaicongviec") mapping["workStatus"] = idx;
    else if (c === "verificationstatus" || c === "trangthaisangminh") mapping["verificationStatus"] = idx;
    else if (c === "cccddate" || c === "cccd" || c === "ngaycccd") mapping["cccdDate"] = idx;
    else if (c === "batch" || c === "batchname" || c === "tenlo" || c === "lo") mapping["batchName"] = idx;
    else if (c === "batchid" || c === "malo" || c === "idlo") mapping["batchId"] = idx;
    else if (c === "assignee" || c === "assigneeid" || c === "nguoigiao" || c === "assigneeuser") mapping["assigneeId"] = idx;
    else if (c === "assignedto" || c === "nguoinhan" || c === "nhanvien") mapping["assignedTo"] = idx;
    else if (c === "invitestatus" || c === "trangthailoimoi") mapping["inviteStatus"] = idx;
    else if (c === "reclickdate" || c === "reclick") mapping["reClickDate"] = idx;
    else if (c === "step2pendingdate" || c === "step2") mapping["step2PendingDate"] = idx;
    else if (c === "channelstatusdetail" || c === "channelstatus") mapping["channelStatusDetail"] = idx;
  });
  return mapping;
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
      await logAuditTrail(userId || "unknown", "UNAUTHORIZED_IMPORT_MAILS_CSV", "mails", {}, req);
      return NextResponse.json({ error: "Không có quyền nhập lô mail từ CSV" }, { status: 403 });
    }

    await dbConnect();

    let csvText = "";
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "Không tìm thấy file tải lên trong form-data" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      csvText = await req.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "Nội dung CSV trống" }, { status: 400 });
    }

    const parsedRows = parseCSV(csvText);
    if (parsedRows.length <= 1) {
      return NextResponse.json({ error: "File CSV phải chứa ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu" }, { status: 400 });
    }

    const headers = parsedRows[0];
    const mapping = normalizeHeaders(headers);

    // Ensure core headers exist or make a best-effort warning
    if (mapping["email"] === undefined) {
      return NextResponse.json({ error: "Không tìm thấy cột 'email' hoặc tiêu đề tương đương trong file CSV" }, { status: 400 });
    }
    if (mapping["type"] === undefined) {
      return NextResponse.json({ error: "Không tìm thấy cột 'type' hoặc tiêu đề tương đương trong file CSV" }, { status: 400 });
    }

    const totalRows = parsedRows.length - 1;
    let duplicateCount = 0;
    let validationErrorCount = 0;

    const validRowsByEmail = new Map<string, any>();
    const importErrors: Array<{ row: number; email?: string; error: string }> = [];

    // 1. First pass: Local CSV row validation & internal duplicate check
    for (let i = 1; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      // Skip completely empty rows
      if (row.length === 0 || (row.length === 1 && row[0] === "")) {
        continue;
      }

      const getVal = (field: string, defaultValue = ""): string => {
        const idx = mapping[field];
        if (idx !== undefined && idx < row.length) {
          return row[idx].trim();
        }
        return defaultValue;
      };

      const email = getVal("email").toLowerCase();
      const type = getVal("type").toUpperCase();
      const status = getVal("status", "LIVE");

      // Validate email format
      if (!email) {
        validationErrorCount++;
        importErrors.push({ row: i + 1, error: "Email không được để trống" });
        continue;
      }
      if (!email.includes("@")) {
        validationErrorCount++;
        importErrors.push({ row: i + 1, email, error: "Định dạng email không hợp lệ" });
        continue;
      }

      // Validate type
      const validTypes = ["ROOT", "SATELLITE", "MONETIZED"];
      if (!type || !validTypes.includes(type)) {
        validationErrorCount++;
        importErrors.push({ row: i + 1, email, error: `Type '${type}' không hợp lệ (Phải là ROOT, SATELLITE, hoặc MONETIZED)` });
        continue;
      }

      // Check internal duplicate in the CSV file
      if (validRowsByEmail.has(email)) {
        duplicateCount++;
        importErrors.push({ row: i + 1, email, error: `Email trùng lặp trong file CSV` });
        continue;
      }

      // Map raw index STT or fallback
      let parsedStt = 0;
      const rawStt = getVal("stt");
      if (rawStt) {
        const num = parseInt(rawStt);
        if (!isNaN(num)) parsedStt = num;
      }

      // Build schema-conforming object
      const mailObject: any = {
        stt: parsedStt,
        email: getVal("email"), // Keep original casing for email representation
        password: getVal("password"),
        recoveryMail: getVal("recoveryMail"),
        twoFA: getVal("twoFA"),
        phone: getVal("phone"),
        phoneLink: getVal("phoneLink"),
        status,
        type,
        workStatus: getVal("workStatus"),
        verificationStatus: getVal("verificationStatus"),
        cccdDate: getVal("cccdDate"),
        batch: getVal("batchName"),
        batchName: getVal("batchName"),
        batchId: getVal("batchId"),
        assigneeId: getVal("assigneeId") || undefined,
        assignedTo: getVal("assignedTo"),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Target-specific schema fields
      if (type === "SATELLITE") {
        mailObject.inviteStatus = getVal("inviteStatus");
        mailObject.links = [];
        mailObject.channelNames = [];
        mailObject.eligibleChannels = [];
      } else if (type === "MONETIZED") {
        mailObject.reClickDate = getVal("reClickDate");
        mailObject.step2PendingDate = getVal("step2PendingDate");
        mailObject.channelStatusDetail = getVal("channelStatusDetail");
      }

      validRowsByEmail.set(email, mailObject);
    }

    // 2. Second pass: Cross-model Database duplicate check
    const uniqueEmailsToTest = Array.from(validRowsByEmail.keys());
    
    const [existingRoots, existingSatellites, existingMonetized] = await Promise.all([
      RootMail.find({ email: { $in: uniqueEmailsToTest } }).select("email").lean(),
      SatelliteMail.find({ email: { $in: uniqueEmailsToTest } }).select("email").lean(),
      MonetizedMail.find({ email: { $in: uniqueEmailsToTest } }).select("email").lean()
    ]);

    const dbExistingEmailsSet = new Set([
      ...existingRoots.map(r => r.email.toLowerCase()),
      ...existingSatellites.map(r => r.email.toLowerCase()),
      ...existingMonetized.map(r => r.email.toLowerCase())
    ]);

    const rootToInsert: any[] = [];
    const satelliteToInsert: any[] = [];
    const monetizedToInsert: any[] = [];

    // Filter database duplicates
    for (const [email, mailObj] of validRowsByEmail.entries()) {
      if (dbExistingEmailsSet.has(email)) {
        duplicateCount++;
        // Find line index for accurate report representation
        const originalRowIndex = parsedRows.findIndex(r => {
          const idx = mapping["email"];
          return idx !== undefined && idx < r.length && r[idx].trim().toLowerCase() === email;
        }) + 1;

        importErrors.push({
          row: originalRowIndex > 0 ? originalRowIndex : 0,
          email: mailObj.email,
          error: "Email đã tồn tại trong cơ sở dữ liệu"
        });
        continue;
      }

      if (mailObj.type === "ROOT") rootToInsert.push(mailObj);
      else if (mailObj.type === "SATELLITE") satelliteToInsert.push(mailObj);
      else if (mailObj.type === "MONETIZED") monetizedToInsert.push(mailObj);
    }

    // Sort errors by row index for clear presentation
    importErrors.sort((a, b) => a.row - b.row);

    // 3. Third pass: High performance batch insertions with unordered resilience
    let insertedCount = 0;
    const insertedRecords: any[] = [];

    const insertWithResilience = async (model: any, docs: any[]) => {
      if (docs.length === 0) return 0;
      try {
        // ordered: false allows continuing even if some documents fail (e.g. duplicate keys)
        const res = await model.insertMany(docs, { ordered: false });
        return res.length;
      } catch (err: any) {
        // Capture how many actually succeeded if there was a partial failure
        if (err.result && err.result.nInserted) {
          return err.result.nInserted;
        }
        // If it's a validation error before insert
        console.error(`Partial insert failure for ${model.modelName}:`, err.message);
        return 0;
      }
    };

    insertedCount += await insertWithResilience(RootMail, rootToInsert);
    insertedCount += await insertWithResilience(SatelliteMail, satelliteToInsert);
    insertedCount += await insertWithResilience(MonetizedMail, monetizedToInsert);

    // 4. Logging & Auditing
    if (insertedCount > 0) {
      try {
        const { logAction } = await import("@/lib/logger");
        await logAction(
          userId || "system",
          "IMPORT_MAILS_CSV",
          `Nhập lô mail từ CSV thành công: Đã thêm ${insertedCount} mails, trùng/lỗi ${duplicateCount + validationErrorCount} dòng.`
        );
      } catch (logErr) {
        console.error("System logAction error:", logErr);
      }

      await logAuditTrail(
        userId || "system",
        "IMPORT_MAILS_CSV_SUCCESS",
        "mails",
        {
          insertedCount,
          duplicateCount,
          validationErrorCount,
          totalRows
        },
        req
      );

      // Create a nice system dashboard log
      try {
        const { Log } = await import("@/models/Log");
        await Log.create({
          user: userId || "System",
          role: userRole === "01" ? "ADMIN" : "QL CÔNG VIỆC",
          action: `[CSV Import] Đã nhập thành công ${insertedCount} tài khoản mail (Bỏ qua ${duplicateCount + validationErrorCount} dòng lỗi/trùng)`,
          type: "SUCCESS",
          timestamp: new Date().toLocaleString("vi-VN")
        });
      } catch (logErr) {
        console.error("System dashboard log creation error:", logErr);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows,
        successCount: insertedCount,
        errorCount: validationErrorCount + duplicateCount,
        duplicateCount,
        validationErrorCount,
        insertedCount
      },
      errors: importErrors
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("LỖI IMPORT CSV:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
