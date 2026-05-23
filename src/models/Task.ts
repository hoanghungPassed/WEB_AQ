import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  batchName?: string;
  assigneeId?: mongoose.Types.ObjectId | string;
  mailIds?: mongoose.Types.ObjectId[] | string[];
  status?: string;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    batchName: { type: String },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    mailIds: [{ type: Schema.Types.ObjectId, ref: 'Mail' }],
    status: { type: String, default: 'PENDING' },
    deadline: { type: Date }
  },
  { timestamps: true }
);

// Xóa model cũ nếu đã tồn tại để tránh lỗi cache Schema khi dev (Hot Reload)
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export const Task: Model<ITask> = mongoose.model<ITask>("Task", TaskSchema, "tasks");
