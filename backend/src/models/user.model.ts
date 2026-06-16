import bcrypt from "bcryptjs";
import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import { env } from "../config/env.js";
import { ROLES, type Role } from "../constants/roles.js";
import { USER_STATUS, type UserStatus } from "../constants/user-status.js";

export interface IUser {
  fullName: string;
  rollNumber: string;
  department: string;
  academicYear: number;
  email: string;
  password: string;
  profilePicture?: string;
  bio: string;
  interests: string[];
  role: Role;
  status: UserStatus;
  lastLogin?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser, UserMethods>;
type UserModel = Model<IUser, object, UserMethods>;

const userSchema = new Schema<IUser, UserModel, UserMethods>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    rollNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    academicYear: { type: Number, required: true, min: 1, max: 8 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    profilePicture: { type: String },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    interests: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
      validate: [(values: string[]) => values.length <= 20, "A maximum of 20 interests is allowed"]
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true
    },
    lastLogin: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordChangedAt: { type: Date }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, returned) {
        const safe = returned as Record<string, unknown>;
        delete safe.password;
        delete safe.passwordResetTokenHash;
        delete safe.passwordResetExpiresAt;
        return returned;
      }
    }
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>("User", userSchema);
