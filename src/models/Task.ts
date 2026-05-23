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

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
