import { StaffData, TaskAssignment } from "@/types/admin";

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
export interface MailData {
  id: number;
  email: string;
  pass: string;
  recovery: string;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  status: "LIVE" | "DIE";
  workStatus: string; // Dynamic status based on type
  channelStatus?: string;
  assignedTo?: string; 
  assigneeId?: string; // ID của nhân viên được giao
  twoFA?: string;
  phone?: string;
  otpLink?: string;
  createdAt?: string;
  links?: string[]; // Cột chứa tối đa 3 link channel YouTube
  channelNames?: string[]; // Channel names scanned
  batchName?: string; // Lô 1 -> Lô 6
  cccdDate?: string;
  verificationStatus?: string;
  isEligible?: boolean;
  inviteStatus?: "Đã mời" | "Chưa mời";
  reClickDate?: string;
  step2PendingDate?: string;
  channelStatusDetail?: string;
}

// Generate satellite mails dynamically so each Role 03 and Role 04 gets exactly 102 satellite mails divided into 6 batches of 17 mails
const generateSatelliteMails = () => {
  const staffList = MOCK_STAFF.filter(s => s.role === "03" || s.role === "04");
  const list: MailData[] = [];
  let globalId = 101;

  staffList.forEach((staff) => {
    for (let loNum = 1; loNum <= 6; loNum++) {
      for (let mIdx = 1; mIdx <= 17; mIdx++) {
        list.push({
          id: globalId++,
          email: `sat.${staff.username}.lo${loNum}.${mIdx}@aqmedia.vn`,
          pass: "pass123",
          recovery: `rec.sat.${staff.username}@gmail.com`,
          type: "SATELLITE" as const,
          status: "LIVE" as const,
          workStatus: "Chưa làm",
          channelStatus: "",
          twoFA: `2FA_SAT_${globalId}`,
          phone: `0900222${String(globalId % 1000).padStart(3, '0')}`,
          otpLink: `https://otp.aqmedia.vn/sat/${globalId}`,
          links: [],
          createdAt: "2024-05-11",
          assigneeId: staff.id, // Fixed ownership
          assignedTo: staff.name,
          batchName: `Lô ${loNum}` // Fixed batch Lô 1 to Lô 6
        });
      }
    }
  });
  return list;
};

export const MOCK_MAILS: MailData[] = [
  // 100 Mail Gốc
  ...Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    email: `root.user${i + 1}@aqmedia.vn`,
    pass: "pass123",
    recovery: `rec.root${i + 1}@gmail.com`,
    type: "ROOT" as const,
    status: "LIVE" as const,
    workStatus: "Chưa làm",
    channelStatus: "",
    twoFA: `2FA_ROOT_${i + 1}`,
    phone: `0900111${String(i).padStart(3, '0')}`,
    otpLink: `https://otp.aqmedia.vn/root/${i + 1}`,
    links: [],
    createdAt: "2024-05-10"
  })),
  // 102 Mail vệ tinh cho mỗi nhân sự 03, 04 (chia thành 6 lô, 17 mail mỗi lô)
  ...generateSatelliteMails(),
  // 100 Mail Bật Kiếm Tiền
  ...Array.from({ length: 100 }, (_, i) => ({
    id: i + 2000,
    email: `mon.user${i + 1}@aqmedia.vn`,
    pass: "pass123",
    recovery: `rec.mon${i + 1}@gmail.com`,
    type: "MONETIZED" as const,
    status: "LIVE" as const,
    workStatus: "Chưa bán",
    channelStatus: "Đã bật quảng cáo",
    twoFA: `2FA_MON_${i + 1}`,
    phone: `0900333${String(i).padStart(3, '0')}`,
    otpLink: `https://otp.aqmedia.vn/mon/${i + 1}`,
    links: [],
    createdAt: "2024-05-12"
  }))
];

// 5. THỐNG KÊ DASHBOARD
export const MOCK_DASHBOARD_STATS = {
  totalMail: 1118,
  mailLive: 1118,
  mailDie: 0,
  mailRoot: 100,
  mailSatellite: 918,
  mailMonetized: 100,
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

export const initMockDB = () => {
  if (typeof window !== "undefined") {
    const storedMails = localStorage.getItem("global_mails_data");
    const currentMails = storedMails ? JSON.parse(storedMails) : [];
    
    // Khởi tạo danh sách user nếu chưa có
    if (!localStorage.getItem("global_users")) {
      localStorage.setItem("global_users", JSON.stringify(MOCK_STAFF));
    }

    if (!storedMails || currentMails.length < 300) {
      localStorage.setItem("global_mails_data", JSON.stringify(MOCK_MAILS));
      localStorage.setItem("global_tasks_data", JSON.stringify(MOCK_TASK_ASSIGNMENTS));
      localStorage.setItem("global_kpi_data", JSON.stringify(MOCK_KPI_DATA));
    }
  }
};
