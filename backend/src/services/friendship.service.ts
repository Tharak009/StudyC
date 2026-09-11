import { ApiError } from "../utils/api-error.js";
import { friendshipRepository, type FriendshipRepository } from "../repositories/friendship.repository.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import { notificationService, type NotificationService } from "./notification.service.js";
import { FRIENDSHIP_STATUS } from "../models/friendship.model.js";
import { NOTIFICATION_TYPES, ENTITY_TYPES } from "../constants/notification.js";

export class FriendshipService {
  constructor(
    private readonly friendships: FriendshipRepository,
    private readonly users: IUserRepository,
    private readonly notifications: NotificationService
  ) {}

  async sendFriendRequest(requesterId: string, recipientId: string) {
    if (requesterId === recipientId) {
      throw new ApiError(400, "Cannot send a friend request to yourself", [], "SELF_FRIEND_FORBIDDEN");
    }

    const [requester, recipient] = await Promise.all([
      this.users.findById(requesterId),
      this.users.findById(recipientId)
    ]);

    if (!recipient) {
      throw new ApiError(404, "Target user not found", [], "USER_NOT_FOUND");
    }

    const existing = await this.friendships.findBetweenUsers(requesterId, recipientId);
    if (existing) {
      if (existing.status === FRIENDSHIP_STATUS.ACCEPTED) {
        throw new ApiError(409, "You are already friends with this user", [], "ALREADY_FRIENDS");
      }

      if (existing.requester.toString() === requesterId) {
        throw new ApiError(409, "Friend request already sent", [], "REQUEST_ALREADY_SENT");
      }

      // If the target user had already sent a request to current user, auto-accept!
      const accepted = await this.friendships.acceptRequest(requesterId, recipientId);
      if (accepted) {
        // Notify both parties
        await this.notifications.createNotification({
          userId: recipientId,
          type: NOTIFICATION_TYPES.FRIEND_ACCEPT,
          title: "Friend Request Accepted",
          message: `${requester?.fullName || "A user"} accepted your friend request.`,
          entityType: ENTITY_TYPES.USER,
          entityId: requester?._id?.toString()
        });
      }
      return { friendship: accepted, status: "ACCEPTED" };
    }

    const created = await this.friendships.createRequest(requesterId, recipientId);

    // Notify recipient
    try {
      await this.notifications.createNotification({
        userId: recipientId,
        type: NOTIFICATION_TYPES.FRIEND_REQUEST,
        title: "New Friend Request",
        message: `${requester?.fullName || "A classmate"} sent you a friend request.`,
        entityType: ENTITY_TYPES.USER,
        entityId: requester?._id?.toString()
      });
    } catch (e) {
      console.error("Failed to send friend request notification:", e);
    }

    return { friendship: created, status: "PENDING" };
  }

  async cancelFriendRequest(requesterId: string, recipientId: string) {
    const deleted = await this.friendships.deleteRequest(requesterId, recipientId);
    if (!deleted) {
      throw new ApiError(404, "No pending friend request found to cancel", [], "REQUEST_NOT_FOUND");
    }
    return { success: true, message: "Friend request cancelled successfully" };
  }

  async acceptFriendRequest(recipientId: string, requesterId: string) {
    const accepted = await this.friendships.acceptRequest(recipientId, requesterId);
    if (!accepted) {
      throw new ApiError(404, "No pending friend request found to accept", [], "REQUEST_NOT_FOUND");
    }

    const recipient = await this.users.findById(recipientId);

    // Notify original requester
    try {
      await this.notifications.createNotification({
        userId: requesterId,
        type: NOTIFICATION_TYPES.FRIEND_ACCEPT,
        title: "Friend Request Accepted",
        message: `${recipient?.fullName || "A user"} accepted your friend request.`,
        entityType: ENTITY_TYPES.USER,
        entityId: recipient?._id?.toString()
      });
    } catch (e) {
      console.error("Failed to send friend accept notification:", e);
    }

    return { friendship: accepted, status: "ACCEPTED" };
  }

  async declineFriendRequest(recipientId: string, requesterId: string) {
    const deleted = await this.friendships.declineRequest(recipientId, requesterId);
    if (!deleted) {
      throw new ApiError(404, "No pending friend request found to decline", [], "REQUEST_NOT_FOUND");
    }
    return { success: true, message: "Friend request declined" };
  }

  async removeFriend(userId: string, friendId: string) {
    const removed = await this.friendships.removeFriendship(userId, friendId);
    if (!removed) {
      throw new ApiError(404, "Friendship not found or already removed", [], "FRIENDSHIP_NOT_FOUND");
    }
    return { success: true, message: "Friend removed successfully" };
  }

  async listFriends(userId: string) {
    const records = await this.friendships.getFriends(userId);
    // Return formatted list of the peer in each friendship
    return records.map((record) => {
      const isRequester = record.requester._id.toString() === userId;
      const peer = isRequester ? record.recipient : record.requester;
      return {
        friendshipId: record._id,
        connectedAt: record.updatedAt,
        user: peer
      };
    });
  }

  async listRequests(userId: string) {
    return this.friendships.getPendingRequests(userId);
  }

  async getFriendshipStatus(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      return { status: "SELF" };
    }

    const record = await this.friendships.findBetweenUsers(userId, targetUserId);
    if (!record) {
      return { status: "NONE" };
    }

    if (record.status === FRIENDSHIP_STATUS.ACCEPTED) {
      return { status: "FRIENDS", friendshipId: record._id };
    }

    if (record.requester.toString() === userId) {
      return { status: "PENDING_SENT", friendshipId: record._id };
    }

    return { status: "PENDING_RECEIVED", friendshipId: record._id };
  }
}

export const friendshipService = new FriendshipService(
  friendshipRepository,
  userRepository,
  notificationService
);
