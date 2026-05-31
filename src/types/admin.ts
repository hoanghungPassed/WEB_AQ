export interface StaffData {
 id: string;
 name: string;
 username: string;
 email: string;
 role?:"01" |"02" |"03" |"04" |"05";
 status:"ACTIVE" |"LOCKED" |"PENDING";
 isOnline: boolean;
 taskCount: number;
 kpiProgress: number; 
 avatar?: string;
 lastActive?: string;
 birthYear?: string;
 phone?: string;
 address?: string;
 baseSalary?: number;
 allowance?: number;
 checkInTime?: string;
 createdAt?: string;
}

export interface TaskAssignment {
 id: string;
 title: string;
 type:"MAIL_GOC" |"MAIL_VE_TINH" |"MAIL_MONETIZED";
 deadline: string;
 progress: number;
 status:"PENDING" |"IN_PROGRESS" |"COMPLETED" |"OVERDUE";
 assigneeId?: string;
 mailCount: number;
 note?: string;
 mailRange?: string;
 mailType?:"ROOT" |"SATELLITE" |"MONETIZED";
 selectedMailIds?: number[];
 assignedAt?: string;
}

export interface TaskMail {
 email: string;
 type: string;
 status:"LIVE" |"DIE";
}

export interface FineReport {
 id: string;
 staffId: string;
 staffName: string;
 reason: string;
 amount: number;
 date: string;
 status:"PENDING" |"PAID" |"OVERDUE";
 notes?: string;
 paymentMethod?:"TRANSFER" |"CASH";
 paymentDate?: string;
}

export type PhoneStatus ="Chưa làm" |"XM lần 1" |"XM lần 2" |"Lỗi";

export interface PhoneItem {
 id: string;
 number: string;
 otpLink: string;
 status: PhoneStatus;
 assigneeId: string | null;
 assignedTo: string | null;
 assignedAt: string | null;
 importedAt: string;
 importBatch?: string;
}

export interface MailData {
 _id?: string;
 id: number;
 stt?: number;
 email: string;
 pass: string;
 recovery: string;
 type:"ROOT" |"SATELLITE" |"MONETIZED";
 status:"LIVE" |"DIE";
 workStatus?: string; // Dynamic status based on type
 updatedBy?: string;
 updatedAt?: string;
 channelStatus?: string;
 batch?: string;
 batchId?: string;
 assignedTo?: string; 
 assigneeId?: string; // ID của nhân viên được giao
 twoFA?: string;
 phone?: string;
 otpLink?: string;
 phoneLink?: string;
 password?: string;
 recoveryMail?: string;
 createdAt?: string;
 links?: string[]; // Cột chứa tối đa 3 link channel YouTube
 channelNames?: string[]; // Channel names scanned
 batchName?: string; // Lô 1 -> Lô 6
 cccdDate?: string;
 verificationStatus?: string;
 isEligible?: boolean;
 inviteStatus?:"Đã mời" |"Chưa mời";
 reClickDate?: string;
 step2PendingDate?: string;
 channelStatusDetail?: string;
 lastUpdated?: string;
}
