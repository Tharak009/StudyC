import { Schema, model, type InferSchemaType } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    tokenId: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date },
    replacedByTokenId: { type: String },
    userAgent: { type: String, maxlength: 500 },
    ipAddress: { type: String, maxlength: 100 }
  },
  { timestamps: true, versionKey: false }
);

export type RefreshTokenEntity = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshToken = model("RefreshToken", refreshTokenSchema);
