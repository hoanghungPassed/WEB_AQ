import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  title: string;
  type: "MAIL_GOC" | "MAIL_VE_TINH" | "MAIL_MONETIZED";
  assigneeId: mongoose.Types.ObjectId | string;
  progress: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  deadline: Date | string;
  mailCount: number;
  note: string;
  batchName: string;
  mailRange: string;
  mailIds: mongoose.Types.ObjectId[] | string[];
  
  // Backward compatibility fields
  taskName?: string;
  assigneeName?: string;
  assignee?: string;
  batch?: string;
  range?: string;
  mailType?: string;
  selectedMailIds?: number[];
  satelliteMailId?: mongoose.Types.ObjectId | string;
  
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ["MAIL_GOC", "MAIL_VE_TINH", "MAIL_MONETIZED"] },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, default: 0 },
    status: { type: String, default: 'PENDING', enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"] },
    deadline: { type: Date, required: true },
    mailCount: { type: Number, default: 0 },
    note: { type: String },
    batchName: { type: String },
    mailRange: { type: String },
    mailIds: [{ type: Schema.Types.ObjectId, ref: 'Mail' }],
    
    // Backward compatibility fields
    taskName: { type: String },
    assigneeName: { type: String },
    assignee: { type: String },
    batch: { type: String },
    range: { type: String },
    mailType: { type: String },
    selectedMailIds: [{ type: Number }],
    satelliteMailId: { type: Schema.Types.ObjectId, ref: 'SatelliteMail' }
  },
  { timestamps: true }
);

TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ mailIds: 1 });
TaskSchema.index({ batch: 1 });
TaskSchema.index({ batchName: 1 });

if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema, "tasks");
