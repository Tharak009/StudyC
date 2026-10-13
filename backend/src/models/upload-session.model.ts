import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IPartInfo {
  partNumber: number;
  etag: string;
}

export type SessionStatus = "INITIATED" | "IN_PROGRESS" | "COMPLETED" | "ABORTED";

export interface IUploadSession {
  s3Key: string;
  uploadId: string;
  communityId?: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalParts: number;
  title: string;
  description: string;
  category: string;
  department?: string;
  semester?: string;
  subjectCode?: string;
  visibility: string;
  tags: string[];
  completedParts: IPartInfo[];
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
}

export type UploadSessionDocument = HydratedDocument<IUploadSession>;
type UploadSessionModel = Model<IUploadSession>;

const partInfoSchema = new Schema<IPartInfo>(
  {
    partNumber: { type: Number, required: true },
    etag: { type: String, required: true }
  },
  { _id: false }
);

const uploadSessionSchema = new Schema<IUploadSession, UploadSessionModel>(
  {
    s3Key: { type: String, required: true },
    uploadId: { type: String, required: true },
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: false, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true, default: "application/octet-stream" },
    totalParts: { type: Number, required: true, min: 1 },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },
    department: { type: String, required: false },
    semester: { type: String, required: false },
    subjectCode: { type: String, required: false },
    visibility: { type: String, required: true, default: "COMMUNITY" },
    tags: { type: [String], default: [] },
    completedParts: { type: [partInfoSchema], default: [] },
    status: {
      type: String,
      enum: ["INITIATED", "IN_PROGRESS", "COMPLETED", "ABORTED"],
      default: "INITIATED"
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 86400000), // 24 hours TTL
      index: { expires: 0 }
    }
  },
  { timestamps: true, versionKey: false }
);

uploadSessionSchema.index({ _id: 1, userId: 1 });

export const UploadSession = model<IUploadSession, UploadSessionModel>(
  "UploadSession",
  uploadSessionSchema,
  "upload_sessions"
);
