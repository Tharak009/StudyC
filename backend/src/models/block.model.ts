import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IBlock {
  blocker: Types.ObjectId;
  blocked: Types.ObjectId;
  createdAt: Date;
}

export type BlockDocument = HydratedDocument<IBlock>;
type BlockModel = Model<IBlock>;

const blockSchema = new Schema<IBlock, BlockModel>(
  {
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1, blocker: 1 });

export const Block = model<IBlock, BlockModel>("Block", blockSchema);
