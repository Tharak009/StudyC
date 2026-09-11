import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { COMMUNITY_CATEGORIES, COMMUNITY_VISIBILITY, type CommunityCategory, type CommunityVisibility } from "../constants/community.js";

export interface IChannel {
  _id?: Types.ObjectId | string;
  name: string;
  type: "text" | "voice" | "announcement";
  category?: "announcements" | "text" | "voice";
  topic?: string;
  isPrivate?: boolean;
  isStrictStudyMode: boolean;
  academicContextTags: string[];
  strictnessThreshold: number;
  allowCodeSnippetsOnly: boolean;
  strikeLimitBeforeTimeout: number;
  timeoutDurationMinutes: number;
}

export interface ICommunity {
  name: string;
  slug: string;
  description: string;
  bannerImage?: string;
  category: CommunityCategory;
  tags: string[];
  visibility: CommunityVisibility;
  owner: Types.ObjectId;
  moderators: Types.ObjectId[];
  memberCount: number;
  channels: IChannel[];
  extensionPoints: {
    chatEnabled: boolean;
    resourcesEnabled: boolean;
    notificationsEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CommunityDocument = HydratedDocument<ICommunity>;
type CommunityModel = Model<ICommunity>;

const channelSchema = new Schema<IChannel>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["text", "voice", "announcement"], default: "text" },
    category: { type: String, enum: ["announcements", "text", "voice"], default: "text" },
    topic: { type: String, trim: true, default: "" },
    isPrivate: { type: Boolean, default: false },
    isStrictStudyMode: { type: Boolean, default: true },
    academicContextTags: {
      type: [String],
      default: ["algorithms", "code", "homework", "exam", "syllabus", "lecture", "assignment"]
    },
    strictnessThreshold: { type: Number, default: 0.4, min: 0.2, max: 0.7 },
    allowCodeSnippetsOnly: { type: Boolean, default: false },
    strikeLimitBeforeTimeout: { type: Number, default: 3, min: 1, max: 10 },
    timeoutDurationMinutes: { type: Number, default: 5, min: 1, max: 60 }
  },
  { _id: true }
);

const communitySchema = new Schema<ICommunity, CommunityModel>(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    bannerImage: { type: String },
    category: { type: String, enum: COMMUNITY_CATEGORIES, required: true, index: true },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
      validate: [(values: string[]) => values.length <= 10, "A maximum of 10 tags is allowed"]
    },
    visibility: {
      type: String,
      enum: Object.values(COMMUNITY_VISIBILITY),
      default: COMMUNITY_VISIBILITY.PUBLIC,
      index: true
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    moderators: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    memberCount: { type: Number, default: 0, min: 0 },
    channels: { type: [channelSchema], default: [] },
    extensionPoints: {
      chatEnabled: { type: Boolean, default: false },
      resourcesEnabled: { type: Boolean, default: false },
      notificationsEnabled: { type: Boolean, default: false }
    }
  },
  { timestamps: true, versionKey: false }
);

communitySchema.index({ name: "text", description: "text", tags: "text" });
communitySchema.index({ category: 1, visibility: 1, createdAt: -1 });

export const Community = model<ICommunity, CommunityModel>("Community", communitySchema);
