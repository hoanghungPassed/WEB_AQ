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
  totalMail: 2450,
  mailLive: 2100,
  mailDie: 350,
  mailMonetized: 85,
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
