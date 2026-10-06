import { ApiError } from "../utils/api-error.js";
import { blockRepository, type BlockRepository } from "../repositories/block.repository.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import { streamService } from "./stream.service.js";
import { toStreamUserId, fromStreamUserId } from "../utils/stream-id.js";

export class BlockService {
  constructor(
    private readonly blocks: BlockRepository,
    private readonly users: IUserRepository
  ) {}

  async blockUser(blockerId: string, blockedId: string) {
    const cleanBlockedId = fromStreamUserId(blockedId);
    const cleanBlockerId = fromStreamUserId(blockerId);
    if (cleanBlockerId === cleanBlockedId) {
      throw new ApiError(400, "You cannot block yourself", [], "SELF_BLOCK_FORBIDDEN");
    }

    const target = await this.users.findById(cleanBlockedId);
    if (!target) {
      throw new ApiError(404, "User to block not found", [], "USER_NOT_FOUND");
    }

    await this.blocks.createBlock(cleanBlockerId, cleanBlockedId);

    // Sync block relationship to Stream Chat server-side client
    if (streamService.isConfigured()) {
      try {
        await streamService.getClient().blockUser(
          toStreamUserId(cleanBlockedId),
          toStreamUserId(cleanBlockerId)
        );
      } catch (streamErr) {
        console.warn("Could not sync user block to Stream Chat:", streamErr);
      }
    }

    return { success: true, message: `Blocked user ${target.fullName}` };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const cleanBlockedId = fromStreamUserId(blockedId);
    const cleanBlockerId = fromStreamUserId(blockerId);
    const deleted = await this.blocks.deleteBlock(cleanBlockerId, cleanBlockedId);
    if (!deleted) {
      throw new ApiError(404, "Block relationship not found", [], "BLOCK_NOT_FOUND");
    }

    // Sync unblock relationship to Stream Chat server-side client
    if (streamService.isConfigured()) {
      try {
        await streamService.getClient().unBlockUser(
          toStreamUserId(cleanBlockedId),
          toStreamUserId(cleanBlockerId)
        );
      } catch (streamErr) {
        console.warn("Could not sync user unblock to Stream Chat:", streamErr);
      }
    }

    return { success: true, message: "User unblocked successfully" };
  }

  async listBlocked(userId: string) {
    const items = await this.blocks.listBlocks(userId);
    return items.map((b: any) => ({
      id: b._id,
      user: b.blocked,
      blockedAt: b.createdAt
    }));
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    return this.blocks.isBlocked(userA, userB);
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return this.blocks.getBlockedUserIds(userId);
  }
}

export const blockService = new BlockService(blockRepository, userRepository);
