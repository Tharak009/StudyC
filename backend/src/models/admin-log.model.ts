import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IAdminLog {
  adminId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
}

export type AdminLogDocument = HydratedDocument<IAdminLog>;
type AdminLogModel = Model<IAdminLog>;

const adminLogSchema = new Schema<IAdminLog, AdminLogModel>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    targetType: { type: String, required: true, trim: true, maxlength: 50 },
    targetId: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
adminLogSchema.index({ action: 1, createdAt: -1 });

export const AdminLog = model<IAdminLog, AdminLogModel>("AdminLog", adminLogSchema);
