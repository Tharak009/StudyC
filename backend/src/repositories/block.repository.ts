import { Block, type BlockDocument } from "../models/block.model.js";

export class BlockRepository {
  async createBlock(blocker: string, blocked: string): Promise<BlockDocument> {
    return Block.findOneAndUpdate(
      { blocker, blocked },
      { blocker, blocked },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  async deleteBlock(blocker: string, blocked: string): Promise<boolean> {
    const res = await Block.deleteOne({ blocker, blocked }).exec();
    return res.deletedCount > 0;
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    if (!userA || !userB || userA === userB) return false;
    const exists = await Block.exists({
      $or: [
        { blocker: userA, blocked: userB },
        { blocker: userB, blocked: userA }
      ]
    });
    return !!exists;
  }

  async isBlockedBy(blocker: string, blocked: string): Promise<boolean> {
    if (!blocker || !blocked) return false;
    const exists = await Block.exists({ blocker, blocked });
    return !!exists;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await Block.find({
      $or: [{ blocker: userId }, { blocked: userId }]
    })
      .lean()
      .exec();

    const ids = new Set<string>();
    for (const b of blocks) {
      if (b.blocker.toString() === userId) {
        ids.add(b.blocked.toString());
      } else {
        ids.add(b.blocker.toString());
      }
    }
    return Array.from(ids);
  }

  async listBlocks(userId: string) {
    return Block.find({ blocker: userId })
      .populate("blocked", "fullName rollNumber department profilePicture")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}

export const blockRepository = new BlockRepository();
