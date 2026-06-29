import { AdminLog } from "../models/admin-log.model.js";
import { Community } from "../models/community.model.js";
import { CommunityMember } from "../models/community-member.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";
import { RefreshToken } from "../models/refresh-token.model.js";
import { Report, type IReport } from "../models/report.model.js";
import { Resource } from "../models/resource.model.js";
import { User } from "../models/user.model.js";
import { DirectMessage } from "../models/direct-message.model.js";
import { reportRepository } from "../repositories/report.repository.js";
import { USER_STATUS } from "../constants/user-status.js";
import { ApiError } from "../utils/api-error.js";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class AdminService {
  // --- Users ---

  async listUsers(query: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const filter: Record<string, unknown> = {};

    if (query.search) {
      const escaped = escapeRegExp(query.search);
      filter.$or = [
        { fullName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { rollNumber: { $regex: escaped, $options: "i" } }
      ];
    }
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password -passwordResetTokenHash -passwordResetExpiresAt")
        .exec(),
      User.countDocuments(filter).exec()
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async getUser(userId: string) {
    const user = await User.findById(userId)
      .select("-password -passwordResetTokenHash -passwordResetExpiresAt")
      .exec();
    if (!user) throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");
    return user;
  }

  async banUser(adminId: string, userId: string) {
    this.assertNotSelf(adminId, userId);
    const user = await this.getUser(userId);
    this.assertTargetNotAdmin(user);
    const previousStatus = user.status;
    user.status = USER_STATUS.DEACTIVATED;
    await user.save();
    await this.log(adminId, "BAN_USER", "User", userId, { previousStatus });
    return user;
  }

  async unbanUser(adminId: string, userId: string) {
    const user = await this.getUser(userId);
    user.status = USER_STATUS.ACTIVE;
    await user.save();
    await this.log(adminId, "UNBAN_USER", "User", userId, {});
    return user;
  }

  async suspendUser(adminId: string, userId: string) {
    this.assertNotSelf(adminId, userId);
    const user = await this.getUser(userId);
    this.assertTargetNotAdmin(user);
    user.status = USER_STATUS.SUSPENDED;
    await user.save();
    await this.log(adminId, "SUSPEND_USER", "User", userId, {});
    return user;
  }

  async activateUser(adminId: string, userId: string) {
    const user = await this.getUser(userId);
    user.status = USER_STATUS.ACTIVE;
    await user.save();
    await this.log(adminId, "ACTIVATE_USER", "User", userId, {});
    return user;
  }

  async deleteUser(adminId: string, userId: string) {
    this.assertNotSelf(adminId, userId);
    const user = await this.getUser(userId);
    this.assertTargetNotAdmin(user);
    const userData = { fullName: user.fullName, email: user.email, rollNumber: user.rollNumber };
    await Promise.all([
      CommunityMember.deleteMany({ userId }).exec(),
      Notification.deleteMany({ userId }).exec(),
      Message.updateMany({ senderId: userId }, { $set: { content: "[deleted user]", deleted: true, deletedAt: new Date() } }).exec(),
      DirectMessage.updateMany({ senderId: userId }, { $set: { content: "[deleted user]", deleted: true, deletedAt: new Date() } }).exec(),
      Resource.deleteMany({ uploadedBy: userId }).exec(),
      Report.deleteMany({ reporterId: userId }).exec(),
      RefreshToken.deleteMany({ user: userId }).exec()
    ]);
    await User.findByIdAndDelete(userId).exec();
    await this.log(adminId, "DELETE_USER", "User", userId, userData);
  }

  // --- Communities ---

  async listCommunities(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const filter: Record<string, unknown> = {};
    if (query.search) {
      const escaped = escapeRegExp(query.search);
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } }
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Community.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("owner", "fullName rollNumber email")
        .exec(),
      Community.countDocuments(filter).exec()
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async deleteCommunity(adminId: string, communityId: string) {
    const community = await Community.findById(communityId).exec();
    if (!community) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    await CommunityMember.deleteMany({ communityId }).exec();
    await Message.deleteMany({ communityId }).exec();
    await Resource.deleteMany({ communityId }).exec();
    await Community.findByIdAndDelete(communityId).exec();
    await this.log(adminId, "DELETE_COMMUNITY", "Community", communityId, {
      name: community.name,
      slug: community.slug
    });
  }

  async getCommunityStats(communityId: string) {
    const community = await Community.findById(communityId).exec();
    if (!community) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    const [memberCount, messageCount, resourceCount] = await Promise.all([
      CommunityMember.countDocuments({ communityId }).exec(),
      Message.countDocuments({ communityId }).exec(),
      Resource.countDocuments({ communityId }).exec()
    ]);
    return { community, memberCount, messageCount, resourceCount };
  }

  // --- Resources ---

  async listResources(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.title = { $regex: escapeRegExp(query.search), $options: "i" };
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Resource.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "fullName rollNumber email")
        .populate("communityId", "name slug")
        .exec(),
      Resource.countDocuments(filter).exec()
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async deleteResource(adminId: string, resourceId: string) {
    const resource = await Resource.findById(resourceId).exec();
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    await Resource.findByIdAndDelete(resourceId).exec();
    await this.log(adminId, "DELETE_RESOURCE", "Resource", resourceId, {
      title: resource.title
    });
  }

  // --- Reports ---

  async listReports(query: { page?: number; limit?: number; status?: string; targetType?: string }) {
    return reportRepository.list({
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 20, 100),
      status: query.status,
      targetType: query.targetType
    });
  }

  async reviewReport(adminId: string, reportId: string, update: { status: IReport["status"]; description?: string }) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new ApiError(404, "Report not found", [], "REPORT_NOT_FOUND");
    const updated = await reportRepository.updateById(reportId, {
      status: update.status,
      reviewedBy: adminId,
      reviewedAt: new Date()
    });
    await this.log(adminId, "REVIEW_REPORT", "Report", reportId, {
      previousStatus: report.status,
      newStatus: update.status
    });
    return updated;
  }

  async createReport(data: {
    reporterId: string;
    targetType: IReport["targetType"];
    targetId: string;
    reason: string;
    description?: string;
  }) {
    return reportRepository.create(data);
  }

  // --- Dashboard Stats ---

  async getDashboardStats() {
    const [userCount, communityCount, resourceCount, reportCount, recentActivity] = await Promise.all([
      User.countDocuments().exec(),
      Community.countDocuments().exec(),
      Resource.countDocuments().exec(),
      Report.countDocuments({ status: "PENDING" }).exec(),
      AdminLog.find().sort({ createdAt: -1 }).limit(10)
        .populate("adminId", "fullName rollNumber")
        .lean()
        .exec()
    ]);

    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).exec();

    return {
      userCount,
      communityCount,
      resourceCount,
      reportCount,
      activeUsers,
      recentActivity
    };
  }

  async deleteMessage(adminId: string, messageId: string) {
    const message = await Message.findByIdAndDelete(messageId).exec();
    if (!message) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    await this.log(adminId, "DELETE_MESSAGE", "Message", messageId, { communityId: message.communityId });
  }

  async deleteDirectMessage(adminId: string, messageId: string) {
    const message = await DirectMessage.findByIdAndDelete(messageId).exec();
    if (!message) throw new ApiError(404, "Direct message not found", [], "DM_NOT_FOUND");
    await this.log(adminId, "DELETE_DIRECT_MESSAGE", "DirectMessage", messageId, {});
  }

  async logAction(adminId: string, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) {
    await this.log(adminId, action, targetType, targetId, details);
  }

  // --- Audit Log ---
  private assertNotSelf(adminId: string, targetId: string) {
    if (adminId === targetId) {
      throw new ApiError(400, "Cannot perform this action on your own account", [], "SELF_ACTION_FORBIDDEN");
    }
  }

  private assertTargetNotAdmin(user: { role: string }) {
    if (user.role === "ADMIN") {
      throw new ApiError(403, "Cannot perform this action on another admin", [], "ADMIN_PROTECTED");
    }
  }

  private async log(adminId: string, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) {
    await AdminLog.create({ adminId, action, targetType, targetId, details });
  }
}

export const adminService = new AdminService();
