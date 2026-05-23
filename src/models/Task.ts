import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  title?: string;
  status?: string;
  assignee?: mongoose.Types.ObjectId | string;
  mailIds?: mongoose.Types.ObjectId[] | string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String },
    status: { type: String },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    mailIds: [{ type: Schema.Types.ObjectId, ref: 'Mail' }]
  },
  { timestamps: true }
);

// Xóa model cũ nếu đã tồn tại để tránh lỗi cache Schema khi dev (Hot Reload)
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export const Task: Model<ITask> = mongoose.model<ITask>("Task", TaskSchema, "tasks");
