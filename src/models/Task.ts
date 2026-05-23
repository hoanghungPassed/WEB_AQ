import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  id?: string;
  title?: string;
  taskName?: string;
  type?: string;
  assigneeId?: mongoose.Types.ObjectId | string;
  assigneeName?: string;
  assignee?: string;
  progress?: number;
  status?: string;
  deadline?: string;
  mailCount?: number;
  note?: string;
  mailRange?: string;
  batch?: string;
  range?: string;
  mailType?: string;
  selectedMailIds?: number[];
  batchName?: string;
  mailIds?: mongoose.Types.ObjectId[] | string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    id: { type: String },
    title: { type: String },
    taskName: { type: String },
    type: { type: String },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    assigneeName: { type: String },
    assignee: { type: String },
    progress: { type: Number, default: 0 },
    status: { type: String, default: 'PENDING' },
    deadline: { type: String },
    mailCount: { type: Number, default: 0 },
    note: { type: String },
    mailRange: { type: String },
    batch: { type: String },
    range: { type: String },
    mailType: { type: String },
    selectedMailIds: [{ type: Number }],
    batchName: { type: String },
    mailIds: [{ type: Schema.Types.ObjectId, ref: 'Mail' }]
  },
  { timestamps: true }
);

// Xóa model cũ nếu đã tồn tại để tránh lỗi cache Schema khi dev (Hot Reload)
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export const Task: Model<ITask> = mongoose.model<ITask>("Task", TaskSchema, "tasks");
