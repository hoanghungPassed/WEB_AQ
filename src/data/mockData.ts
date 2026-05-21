import { StaffData, TaskAssignment, MailData } from "@/types/admin";
import { ROOT_MAILS } from "./rootData";
import { SATELLITE_MAILS } from "./satelliteData";
import { MONETIZED_MAILS } from "./monetizedData";

// 1. CẤU HÌNH NGƯỜI DÙNG HỆ THỐNG
export const MOCK_USERS = [
  { username: "01", password: "123", role: "ADMIN", name: "Nguyễn Admin", email: "admin@aqmedia.vn" },
  { username: "02", password: "123", role: "QUẢN LÝ CÔNG VIỆC", name: "Trần Quản Lý CV", email: "manager_task@aqmedia.vn" },
  { username: "03", password: "123", role: "QUẢN LÝ NHÂN SỰ", name: "Lê Nhân Sự", email: "manager_hr@aqmedia.vn" },
  // 8 Tài khoản nhân viên test
  ...Array.from({ length: 8 }, (_, i) => ({
    username: `staff${i + 1}`,
    password: "123",
    role: "NHÂN VIÊN",
    name: `Nhân Viên ${i + 1}`,
    email: `staff${i + 1}@aqmedia.vn`
  }))
];

export const MOCK_ACCESS_REQUESTS = [];
export const MOCK_OTP = "123456";

// 2. DANH SÁCH NHÂN SỰ CHI TIẾT
export const MOCK_STAFF: StaffData[] = [
  { id: "1", name: "Nguyễn Admin", username: "01", email: "admin@aqmedia.vn", role: "01", status: "ACTIVE", isOnline: true, taskCount: 0, kpiProgress: 0, lastActive: "Vừa xong", birthYear: "1990", phone: "0988111111", address: "Hà Nội", password: "123" },
  { id: "2", name: "Trần Quản Lý CV", username: "02", email: "manager_task@aqmedia.vn", role: "02", status: "ACTIVE", isOnline: true, taskCount: 0, kpiProgress: 0, lastActive: "Vừa xong", birthYear: "1992", phone: "0988222222", address: "Hải Phòng", password: "123" },
  { id: "3", name: "Lê Quản Lý NS", username: "03", email: "manager_hr@aqmedia.vn", role: "03", status: "ACTIVE", isOnline: true, taskCount: 0, kpiProgress: 0, lastActive: "Vừa xong", birthYear: "1993", phone: "0988333333", address: "Đà Nẵng", password: "123" },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 4),
    name: `Nhân Viên ${i + 1}`,
    username: `staff${i + 1}`,
    email: `staff${i + 1}@aqmedia.vn`,
    role: "04" as const,
    status: "ACTIVE" as const,
    isOnline: true,
    taskCount: 0,
    kpiProgress: 0,
    lastActive: "Vừa xong",
    birthYear: String(1995 + i),
    phone: `098844444${i + 1}`,
    address: i % 2 === 0 ? "Hà Nội" : "TP.HCM",
    password: "123"
  }))
];

// 3. DANH SÁCH NHIỆM VỤ
export const MOCK_TASK_ASSIGNMENTS: TaskAssignment[] = [
  { id: "task-1", title: "Check, xóa, tạo", type: "MAIL_GOC", assigneeId: "", progress: 45, status: "IN_PROGRESS", deadline: "2024-05-30", mailCount: 150 },
  { id: "task-2", title: "Mời kênh", type: "MAIL_VE_TINH", assigneeId: "", progress: 60, status: "IN_PROGRESS", deadline: "2024-05-30", mailCount: 80 },
  { id: "task-3", title: "Làm kênh", type: "MAIL_VE_TINH", assigneeId: "", progress: 30, status: "IN_PROGRESS", deadline: "2024-05-30", mailCount: 45 },
  { id: "task-4", title: "Kênh bật kiếm tiền", type: "MAIL_MONETIZED", assigneeId: "", progress: 15, status: "IN_PROGRESS", deadline: "2024-05-30", mailCount: 20 },
];

// 4. KHO DỮ LIỆU MAIL TỔNG (ĐÚNG 300 CÁI)

export const MOCK_MAILS: MailData[] = [
  ...ROOT_MAILS,
  ...SATELLITE_MAILS,
  ...MONETIZED_MAILS
];

// 5. THỐNG KÊ DASHBOARD
export const MOCK_DASHBOARD_STATS = {
  totalMail: ROOT_MAILS.length + SATELLITE_MAILS.length + MONETIZED_MAILS.length,
  mailLive: ROOT_MAILS.length + SATELLITE_MAILS.length + MONETIZED_MAILS.length,
  mailDie: 0,
  mailRoot: ROOT_MAILS.length,
  mailSatellite: SATELLITE_MAILS.length,
  mailMonetized: MONETIZED_MAILS.length,
  tasksToday: 4,
  staffOnline: 11,
  mailWatchHours: 15
};

// 6. THIẾT LẬP KPI QUÝ
export const MOCK_KPI_DATA = {
  targetMonetized: 500,
  currentMonetized: 100,
  targetWatchHours: 2000,
  currentWatchHours: 450,
  startDate: "2024-04-01",
  endDate: "2024-06-30"
};

// 7. BÁOO CÁO ĐI MUỘN (FINE REPORTS)
import { FineReport } from "@/types/admin";

export const MOCK_FINE_REPORTS: FineReport[] = [
  {
    id: "fine-1",
    staffId: "4",
    staffName: "Nhân Viên 1",
    reason: "Đi muộn 30 phút",
    amount: 50000,
    date: "2024-05-20",
    status: "PAID",
    paymentMethod: "TRANSFER",
    paymentDate: "2024-05-20",
    notes: "Đi muộn do kẹt xe"
  },
  {
    id: "fine-2",
    staffId: "5",
    staffName: "Nhân Viên 2",
    reason: "Vắng ngày không phép",
    amount: 200000,
    date: "2024-05-19",
    status: "PENDING",
    notes: "Chưa nộp phạt"
  },
  {
    id: "fine-3",
    staffId: "6",
    staffName: "Nhân Viên 3",
    reason: "Đi muộn 1 giờ",
    amount: 100000,
    date: "2024-05-18",
    status: "PAID",
    paymentMethod: "CASH",
    paymentDate: "2024-05-18"
  },
  {
    id: "fine-4",
    staffId: "7",
    staffName: "Nhân Viên 4",
    reason: "Vắng nửa ngày không phép",
    amount: 100000,
    date: "2024-05-17",
    status: "OVERDUE",
    notes: "Quá hạn thanh toán 2 ngày"
  },
  {
    id: "fine-5",
    staffId: "8",
    staffName: "Nhân Viên 5",
    reason: "Đi muộn 15 phút",
    amount: 25000,
    date: "2024-05-16",
    status: "PAID",
    paymentMethod: "TRANSFER",
    paymentDate: "2024-05-16"
  },
  {
    id: "fine-6",
    staffId: "9",
    staffName: "Nhân Viên 6",
    reason: "Đi muộn 45 phút",
    amount: 75000,
    date: "2024-05-15",
    status: "PENDING",
    notes: "Chờ thanh toán"
  },
  {
    id: "fine-7",
    staffId: "4",
    staffName: "Nhân Viên 1",
    reason: "Vắng ngày không phép",
    amount: 200000,
    date: "2024-05-14",
    status: "PAID",
    paymentMethod: "TRANSFER",
    paymentDate: "2024-05-14"
  }
];

export const initMockDB = () => {
  if (typeof window !== "undefined") {
    const storedMails = localStorage.getItem("global_mails_data");
    const currentMails = storedMails ? JSON.parse(storedMails) : [];
    
    const storedUsers = localStorage.getItem("global_users");

    // CHỈ seed nếu localStorage HOÀN TOÀN trống (lần đầu mở trình duyệt)
    // KHÔNG BAO GIỜ overwrite dữ liệu đã có để tránh xóa trạng thái đã duyệt!
    if (!storedUsers) {
      localStorage.setItem("global_users", JSON.stringify(MOCK_STAFF));
    } else {
      // Chỉ merge thêm các tài khoản staff1-8 còn thiếu, KHÔNG xóa tài khoản hiện có
      const currentUsers = JSON.parse(storedUsers);
      const staffAccounts = MOCK_STAFF.filter(s => s.username.startsWith("staff") || ["01","02","03"].includes(s.username));
      let changed = false;
      let merged = [...currentUsers];
      for (const staffUser of staffAccounts) {
        const exists = merged.some((u: any) => u.username === staffUser.username);
        if (!exists) {
          merged.push(staffUser);
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("global_users", JSON.stringify(merged));
      }
    }

    // Migration: phát hiện data cũ (email giả sat.user.xxx hoặc root.user hoặc mon.user)
    const hasOldFakeData = currentMails.some((m: any) => m.email.includes("sat.user.") || m.email.includes("root.user") || m.email.includes("mon.user"));
    const totalExpected = MOCK_MAILS.length;

    if (!storedMails || currentMails.length !== totalExpected || hasOldFakeData) {
      // Nếu đã có assignment data, phải giữ lại sau khi reseed
      const existingAssignments: Record<number, any> = {};
      currentMails.forEach((m: any) => {
        if (m.type === "SATELLITE" && (m.assigneeId || m.batchName)) {
          // Tìm index tương ứng: mail cũ có id=1001+idx, new id=1001+idx vẫn vậy
          existingAssignments[m.id] = {
            assigneeId: m.assigneeId,
            assignedTo: m.assignedTo,
            batchName: m.batchName,
            workStatus: m.workStatus,
          };
        }
      });

      const freshMails = MOCK_MAILS.map((m: any) => {
        const saved = existingAssignments[m.id];
        return saved ? { ...m, ...saved } : m;
      });

      localStorage.setItem("global_mails_data", JSON.stringify(freshMails));
      localStorage.setItem("global_tasks_data", JSON.stringify(MOCK_TASK_ASSIGNMENTS));
      localStorage.setItem("global_kpi_data", JSON.stringify(MOCK_KPI_DATA));
      localStorage.setItem("global_fine_reports", JSON.stringify(MOCK_FINE_REPORTS));
    } else {
      // Đảm bảo luôn có fine reports data
      const storedFines = localStorage.getItem("global_fine_reports");
      if (!storedFines) {
        localStorage.setItem("global_fine_reports", JSON.stringify(MOCK_FINE_REPORTS));
      }
    }
  }
};
