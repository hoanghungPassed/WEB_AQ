import mongoose, { Schema, Document, Model } from"mongoose";

export interface ISatelliteMail extends Document {
 stt?: number;
 email: string;
 password?: string;
 recoveryMail?: string;
 twoFA?: string;
 phone?: string;
 phoneLink?: string;
 status: string;
 type: string; //"SATELLITE"
 workStatus?: string;
 batch?: string;
 batchName?: string;
 batchId?: string;
 assignee?: mongoose.Types.ObjectId | string;
 assigneeId?: string;
 assignedTo?: string;
 isAssigned?: boolean;
 updatedBy?: string;
 lastUpdated?: string;
 links?: string[];
 channelNames?: string[];
 eligibleChannels?: boolean[];
 inviteStatus?: string;
 createdAt: Date;
 updatedAt: Date;
}

const SatelliteMailSchema: Schema = new Schema(
 {
 stt: { type: Number, default: 0 },
 email: { type: String, required: true },
 password: { type: String, default:"" },
 recoveryMail: { type: String, default:"" },
 twoFA: { type: String, default:"" },
 phone: { type: String, default:"" },
 phoneLink: { type: String, default:"" },
 status: { type: String, default: 'LIVE' },
 type: { type: String, default: 'SATELLITE' },
 workStatus: { type: String },
 batch: { type: String },
 batchName: { type: String },
 batchId: { type: String },
 assignee: { type: Schema.Types.ObjectId, ref: 'User' },
 assigneeId: { type: String },
 assignedTo: { type: String },
 isAssigned: { type: Boolean, default: false },
 updatedBy: { type: String },
 lastUpdated: { type: String },
 links: { type: [String], default: [] },
 channelNames: { type: [String], default: [] },
 eligibleChannels: { type: [Boolean], default: [] },
 inviteStatus: { type: String }
 },
 { timestamps: true }
);

SatelliteMailSchema.index({ email: 1 });
SatelliteMailSchema.index({ batchId: 1, batchName: 1 });
SatelliteMailSchema.index({ assigneeId: 1 });
SatelliteMailSchema.index({ status: 1 });
SatelliteMailSchema.index({ workStatus: 1 });
SatelliteMailSchema.index({ eligibleChannels: 1, batchId: 1, assigneeId: 1, status: 1 });

if (mongoose.models.SatelliteMail) {
 delete mongoose.models.SatelliteMail;
}

export const SatelliteMail: Model<ISatelliteMail> = mongoose.model<ISatelliteMail>("SatelliteMail", SatelliteMailSchema,"satellite_mails");
