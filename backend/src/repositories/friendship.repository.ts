import { Friendship, type FriendshipDocument, FRIENDSHIP_STATUS } from "../models/friendship.model.js";

export class FriendshipRepository {
  async findBetweenUsers(userA: string, userB: string): Promise<FriendshipDocument | null> {
    return Friendship.findOne({
      $or: [
        { requester: userA, recipient: userB },
        { requester: userB, recipient: userA }
      ]
    }).exec();
  }

  async createRequest(requesterId: string, recipientId: string): Promise<FriendshipDocument> {
    return Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: FRIENDSHIP_STATUS.PENDING
    });
  }

  async deleteRequest(requesterId: string, recipientId: string): Promise<FriendshipDocument | null> {
    return Friendship.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: FRIENDSHIP_STATUS.PENDING
    }).exec();
  }

  async acceptRequest(recipientId: string, requesterId: string): Promise<FriendshipDocument | null> {
    return Friendship.findOneAndUpdate(
      {
        requester: requesterId,
        recipient: recipientId,
        status: FRIENDSHIP_STATUS.PENDING
      },
      { status: FRIENDSHIP_STATUS.ACCEPTED },
      { new: true }
    ).exec();
  }

  async declineRequest(recipientId: string, requesterId: string): Promise<FriendshipDocument | null> {
    return Friendship.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: FRIENDSHIP_STATUS.PENDING
    }).exec();
  }

  async removeFriendship(userA: string, userB: string): Promise<FriendshipDocument | null> {
    return Friendship.findOneAndDelete({
      status: FRIENDSHIP_STATUS.ACCEPTED,
      $or: [
        { requester: userA, recipient: userB },
        { requester: userB, recipient: userA }
      ]
    }).exec();
  }

  async getFriends(userId: string): Promise<FriendshipDocument[]> {
    return Friendship.find({
      status: FRIENDSHIP_STATUS.ACCEPTED,
      $or: [{ requester: userId }, { recipient: userId }]
    })
      .populate("requester", "fullName rollNumber department academicYear profilePicture status lastLogin")
      .populate("recipient", "fullName rollNumber department academicYear profilePicture status lastLogin")
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getPendingRequests(userId: string) {
    const [sent, received] = await Promise.all([
      Friendship.find({
        requester: userId,
        status: FRIENDSHIP_STATUS.PENDING
      })
        .populate("recipient", "fullName rollNumber department academicYear profilePicture status lastLogin")
        .sort({ createdAt: -1 })
        .exec(),
      Friendship.find({
        recipient: userId,
        status: FRIENDSHIP_STATUS.PENDING
      })
        .populate("requester", "fullName rollNumber department academicYear profilePicture status lastLogin")
        .sort({ createdAt: -1 })
        .exec()
    ]);

    return { sent, received };
  }
}

export const friendshipRepository = new FriendshipRepository();
