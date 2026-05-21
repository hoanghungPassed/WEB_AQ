export interface StaffData {
  id: string;
  name: string;
  username: string;
  email: string;
  role?: "01" | "02" | "03" | "04";
  status: "ACTIVE" | "LOCKED" | "PENDING";
  isOnline: boolean;
  taskCount: number;
  kpiProgress: number; 
  avatar?: string;
  lastActive?: string;
  birthYear?: string;
  phone?: string;
  address?: string;
  password?: string;
  checkInTime?: string;
}

export interface TaskAssignment {
  id: string;
  title: string;
  type: "MAIL_GOC" | "MAIL_VE_TINH" | "MAIL_MONETIZED";
  deadline: string;
  progress: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  assigneeId?: string;
  mailCount: number;
  note?: string;
  mailRange?: string;
  mailType?: "ROOT" | "SATELLITE" | "MONETIZED";
  selectedMailIds?: number[];
}

export interface TaskMail {
  email: string;
  type: string;
  status: "LIVE" | "DIE";
}

export interface FineReport {
  id: string;
  staffId: string;
  staffName: string;
  reason: string;
  amount: number;
  date: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  notes?: string;
  paymentMethod?: "TRANSFER" | "CASH";
  paymentDate?: string;
}
