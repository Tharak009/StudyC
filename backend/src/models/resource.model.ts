import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { RESOURCE_CATEGORIES, RESOURCE_VISIBILITY, type ResourceCategory, type ResourceVisibility } from "../constants/resource.js";

export interface IResource {
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: ResourceCategory;
  tags: string[];
  department?: string;
  semester?: string;
  subjectCode?: string;
  format?: string;
  rating?: number;
  reviewCount?: number;
  uploadedBy: Types.ObjectId;
  communityId?: Types.ObjectId;
  downloadCount: number;
  visibility: ResourceVisibility;
  contentHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ResourceDocument = HydratedDocument<IResource>;
type ResourceModel = Model<IResource>;

const resourceSchema = new Schema<IResource, ResourceModel>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 0 },
    fileType: { type: String, required: true },
    category: { type: String, enum: RESOURCE_CATEGORIES, required: true, index: true },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
      validate: [(values: string[]) => values.length <= 10, "A maximum of 10 tags is allowed"]
    },
    department: { type: String, trim: true, index: true },
    semester: { type: String, trim: true, index: true },
    subjectCode: { type: String, trim: true, index: true },
    format: { type: String, trim: true, index: true },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 1, min: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: false, index: true },
    downloadCount: { type: Number, default: 0, min: 0 },
    visibility: {
      type: String,
      enum: Object.values(RESOURCE_VISIBILITY),
      default: RESOURCE_VISIBILITY.COMMUNITY
    },
    contentHash: { type: String }
  },
  { timestamps: true, versionKey: false }
);

resourceSchema.index({ title: "text", description: "text", tags: "text", subjectCode: "text" });
resourceSchema.index({ category: 1, communityId: 1, createdAt: -1 });
resourceSchema.index({ department: 1, semester: 1, category: 1, downloadCount: -1 });
resourceSchema.index({ communityId: 1, createdAt: -1 });
resourceSchema.index({ communityId: 1, downloadCount: -1 });
resourceSchema.index({ uploadedBy: 1, createdAt: -1 });
resourceSchema.index({ contentHash: 1 }, { unique: true, sparse: true });

export const Resource = model<IResource, ResourceModel>("Resource", resourceSchema);
