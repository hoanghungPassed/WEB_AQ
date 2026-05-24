import mongoose, { Schema, Model } from"mongoose";

export interface ISyncStore {
 key: string;
 value: string;
 updatedAt: Date;
}

const syncStoreSchema = new Schema<ISyncStore>(
 {
 key: {
 type: String,
 required: true,
 unique: true,
 index: true,
 },
 value: {
 type: String,
 default:"",
 },
 },
 {
 timestamps: true,
 }
);

export const SyncStore: Model<ISyncStore> =
 mongoose.models.SyncStore ||
 mongoose.model<ISyncStore>("SyncStore", syncStoreSchema,"sync_store");
