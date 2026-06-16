import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { REPORT_TARGET_TYPES, REPORT_STATUS, type ReportTargetType, type ReportStatus } from "../constants/report.js";

export interface IReport {
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: string;
  description: string;
  status: ReportStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportDocument = HydratedDocument<IReport>;
type ReportModel = Model<IReport>;

const reportSchema = new Schema<IReport, ReportModel>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: Object.values(REPORT_TARGET_TYPES), required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: Object.values(REPORT_STATUS), default: REPORT_STATUS.PENDING, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export const Report = model<IReport, ReportModel>("Report", reportSchema);
