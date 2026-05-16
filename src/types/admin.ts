export interface StaffData {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "01" | "02" | "03" | "04";
  status: "ACTIVE" | "LOCKED";
  isOnline: boolean;
  taskCount: number;
  kpiProgress: number; // 0-100
  avatar?: string;
  lastActive?: string;
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
}

export interface TaskMail {
  email: string;
  type: string;
  status: "LIVE" | "DIE";
}
