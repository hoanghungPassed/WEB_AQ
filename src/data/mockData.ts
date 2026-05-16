import { StaffData, TaskAssignment } from "@/types/admin";

// Dữ liệu người dùng hệ thống
export const MOCK_USERS = [
  { 
    username: "01", 
    password: "123", 
    role: "ADMIN", 
    name: "Quản Trị Viên",
    email: "admin@aqmedia.vn",
    phone: "01",
    address: "Hà Nội, Việt Nam"
  },
  { 
    username: "02", 
    password: "123", 
    role: "QUẢN LÝ CÔNG VIỆC", 
    name: "Trần Quản Lý",
    email: "manager.task@aqmedia.vn",
    phone: "02",
    address: "TP. Hồ Chí Minh"
  },
  { 
    username: "03", 
    password: "123", 
    role: "QUẢN LÝ NHÂN SỰ", 
    name: "Lê Nhân Sự",
    email: "manager.hr@aqmedia.vn",
    phone: "03",
    address: "Đà Nẵng"
  },
  { 
    username: "04", 
    password: "123", 
    role: "NHÂN VIÊN", 
    name: "Nguyễn Nhân Viên",
    email: "staff@aqmedia.vn",
    phone: "04",
    address: "Hải Phòng"
  },
];

export const MOCK_TASKS = [
  { id: 1, title: "Thiết kế Landing Page", status: "In Progress" },
  { id: 2, title: "Viết nội dung quảng cáo", status: "Completed" },
];

export const MOCK_OTP = "123456";

export interface MailData {
  id: number;
  email: string;
  pass: string;
  recovery: string;
  twoFA?: string;
  phone?: string;
  otpLink?: string;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  status: "LIVE" | "DIE";
  channelStatus?: string;
  assignedTo?: string; 
  workStatus: "CHƯA LÀM" | "ĐANG LÀM" | "HOÀN THÀNH";
  createdAt: string;
}

const CHANNEL_STATUSES = [
  "Chờ B2 ngày 15/05",
  "Chờ B3 ngày 16/05",
  "Lỗi B2",
  "Đã bật ngày 14/05",
  "Ngày 17/05 quay video",
  "Đã Kháng",
  "Die Spam",
  "Chưa SUB",
  "Mất kênh"
];

export const MOCK_MAILS: MailData[] = [
  ...Array.from({ length: 150 }, (_, i) => ({
    id: i + 1,
    email: `live.user${i + 1}@aqmedia.vn`,
    pass: `pass${i + 1}`,
    recovery: `rec${i + 1}@gmail.com`,
    twoFA: "LIVE-2FA-CODE",
    phone: `091${Math.floor(1000000 + Math.random() * 9000000)}`,
    otpLink: "https://otp-aq.vn/live",
    status: "LIVE" as const,
    type: (i < 20 ? "MONETIZED" : i < 80 ? "SATELLITE" : "ROOT") as any,
    workStatus: "CHƯA LÀM" as const,
    channelStatus: i < 20 ? CHANNEL_STATUSES[i % CHANNEL_STATUSES.length] : "",
    createdAt: "2024-05-01"
  })),
  ...Array.from({ length: 50 }, (_, i) => ({
    id: i + 151,
    email: `die.user${i + 1}@aqmedia.vn`,
    pass: `pass${i + 1}`,
    recovery: `rec${i + 1}@gmail.com`,
    twoFA: "DIE-2FA-CODE",
    phone: `090${Math.floor(1000000 + Math.random() * 9000000)}`,
    otpLink: "https://otp-aq.vn/die",
    status: "DIE" as const,
    type: "SATELLITE" as const,
    workStatus: "CHƯA LÀM" as const,
    channelStatus: "Mất kênh",
    createdAt: "2024-05-10"
  }))
];

export const MOCK_DASHBOARD_STATS = {
  totalMail: 200,
  mailLive: 150,
  mailDie: 50,
  mailMonetized: 20,
  mailWatchHours: 120,
  staffOnline: 12,
  tasksToday: 25
};

export const MOCK_KPI_DATA = {
  startDate: "2024-05-01",
  endDate: "2024-05-31",
  targetMonetized: 50,
  targetWatchHours: 100,
  currentMonetized: 32,
  currentWatchHours: 65
};

export const MOCK_STAFF_ATTENDANCE = [
  { id: 1, name: "Nguyễn Văn A", role: "Nhân viên", morning: "08:00 - 12:00", afternoon: "13:30 - 17:30", totalHours: 8.0, status: "ONLINE" },
  { id: 2, name: "Trần Thị B", role: "Nhân viên", morning: "08:15 - 12:00", afternoon: "13:30 - 17:00", totalHours: 7.25, status: "ONLINE" },
  { id: 3, name: "Lê Văn C", role: "Quản lý công việc", morning: "08:00 - 12:00", afternoon: "13:30 - 18:00", totalHours: 8.5, status: "ONLINE" },
  { id: 4, name: "Phạm Minh D", role: "Nhân viên", morning: "09:00 - 12:00", afternoon: "13:30 - 17:30", totalHours: 7.0, status: "ONLINE" },
  { id: 5, name: "Hoàng An", role: "Quản lý nhân sự", morning: "08:00 - 12:00", afternoon: "13:30 - 17:30", totalHours: 8.0, status: "ONLINE" },
  { id: 6, name: "Đặng Thu", role: "Nhân viên", morning: "08:00 - 12:00", afternoon: "13:30 - 17:30", totalHours: 8.0, status: "OFFLINE" },
];

export const MOCK_ACCESS_REQUESTS = [];

export const MOCK_STAFF: StaffData[] = [
  { id: "1", name: "Nguyễn Văn A", username: "admin01", email: "a.nguyen@aqmedia.vn", role: "01", status: "ACTIVE", isOnline: true, taskCount: 5, kpiProgress: 85, lastActive: "Vừa xong" },
  { id: "2", name: "Trần Thị B", username: "leader02", email: "b.tran@aqmedia.vn", role: "02", status: "ACTIVE", isOnline: true, taskCount: 12, kpiProgress: 92, lastActive: "Vừa xong" },
  { id: "3", name: "Lê Văn C", username: "staff03", email: "c.le@aqmedia.vn", role: "03", status: "ACTIVE", isOnline: false, taskCount: 8, kpiProgress: 45, lastActive: "10 phút trước" },
  { id: "4", name: "Phạm Minh D", username: "staff04", email: "d.pham@aqmedia.vn", role: "03", status: "LOCKED", isOnline: false, taskCount: 0, kpiProgress: 0, lastActive: "2 ngày trước" },
  { id: "5", name: "Hoàng An", username: "leader05", email: "an.hoang@aqmedia.vn", role: "02", status: "ACTIVE", isOnline: true, taskCount: 15, kpiProgress: 78, lastActive: "Vừa xong" },
  { id: "6", name: "Đặng Thu", username: "staff06", email: "thu.dang@aqmedia.vn", role: "04", status: "ACTIVE", isOnline: true, taskCount: 4, kpiProgress: 60, lastActive: "Vừa xong" },
];

export const MOCK_TASK_ASSIGNMENTS: TaskAssignment[] = [
  { id: "T1", title: "Nuôi mail vệ tinh đợt 1", type: "MAIL_VE_TINH", deadline: "2024-05-20", progress: 65, status: "IN_PROGRESS", assigneeId: "3", mailCount: 50 },
  { id: "T2", title: "Kháng mail bật kiếm tiền", type: "MAIL_MONETIZED", deadline: "2024-05-18", progress: 100, status: "COMPLETED", assigneeId: "2", mailCount: 10 },
  { id: "T3", title: "Cấu hình mail gốc hệ thống", type: "MAIL_GOC", deadline: "2024-05-25", progress: 20, status: "PENDING", mailCount: 100 },
  { id: "T4", title: "Check spam danh sách 05", type: "MAIL_VE_TINH", deadline: "2024-05-15", progress: 45, status: "OVERDUE", assigneeId: "6", mailCount: 30 },
];
