import mongoose, { type FilterQuery } from "mongoose";
import {
  CallLog,
  type ICallLog,
  type CallLogDocument,
  type CallLogStatus,
  type CallLogType
} from "../models/call-log.model.js";

export interface CreateCallLogData {
  callId: string;
  callerId: string | mongoose.Types.ObjectId;
  callerName: string;
  callerAvatar?: string;
  calleeId?: string | mongoose.Types.ObjectId | null;
  calleeName?: string | null;
  calleeAvatar?: string | null;
  channelId?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  type: CallLogType;
  mode: "direct" | "group" | "stage";
  status: CallLogStatus;
  startedAt: Date;
  connectedAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds?: number;
  endReason?: string | null;
  participants?: Array<{
    userId: string | mongoose.Types.ObjectId;
    name: string;
    avatar?: string;
    role?: string;
    joinedAt: Date;
    leftAt?: Date;
  }>;
}

export interface CallLogListOptions {
  page?: number;
  limit?: number;
  status?: CallLogStatus;
  type?: CallLogType;
  search?: string;
}

export class CallLogRepository {
  async create(data: CreateCallLogData): Promise<CallLogDocument> {
    return CallLog.create(data);
  }

  async findByCallId(callId: string): Promise<CallLogDocument | null> {
    return CallLog.findOne({ callId }).exec();
  }

  async updateByCallId(callId: string, update: Partial<ICallLog>): Promise<CallLogDocument | null> {
    return CallLog.findOneAndUpdate({ callId }, { $set: update }, { new: true }).exec();
  }

  async updateActiveDirectCall(callId: string, update: Partial<ICallLog>): Promise<CallLogDocument | null> {
    return CallLog.findOneAndUpdate(
      { callId, mode: "direct", status: { $in: ["ringing", "connecting", "connected", "reconnecting"] } },
      { $set: update },
      { new: true }
    ).exec();
  }

  async updateActiveGroupCall(callId: string, update: Partial<ICallLog>): Promise<CallLogDocument | null> {
    return CallLog.findOneAndUpdate(
      { callId, mode: { $in: ["group", "stage"] }, status: { $in: ["connecting", "connected", "reconnecting"] } },
      { $set: update },
      { new: true }
    ).exec();
  }

  async listActiveGroupCalls(): Promise<CallLogDocument[]> {
    return CallLog.find({
      mode: { $in: ["group", "stage"] },
      status: { $in: ["connecting", "connected", "reconnecting"] }
    }).exec();
  }

  async listActiveDirectCalls(): Promise<CallLogDocument[]> {
    return CallLog.find({
      mode: "direct",
      status: { $in: ["ringing", "connecting", "connected", "reconnecting"] }
    }).exec();
  }

  async listUserHistory(userId: string, options: CallLogListOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    if (!userObjectId) {
      return { items: [], total: 0, page, limit, pages: 1 };
    }

    const userMatch: FilterQuery<ICallLog> = {
      $or: [
        { callerId: userObjectId },
        { calleeId: userObjectId },
        { "participants.userId": userObjectId }
      ]
    };
    const filter: FilterQuery<ICallLog> = { ...userMatch };

    if (options.status) {
      filter.status = options.status;
    } else {
      filter.status = { $in: ["completed", "missed", "declined", "cancelled", "failed"] };
    }
    if (options.type) {
      filter.type = options.type;
    }

    const search = options.search?.trim().slice(0, 100);
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nameMatch = { $regex: escapedSearch, $options: "i" };
      filter.$and = [
        userMatch,
        { $or: [
          { callerName: nameMatch },
          { calleeName: nameMatch },
          { communityName: nameMatch }
        ] }
      ];
    }

    const [items, total] = await Promise.all([
      CallLog.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      CallLog.countDocuments(filter).exec()
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    };
  }

  async deleteById(logId: string): Promise<boolean> {
    const result = await CallLog.findByIdAndDelete(logId).exec();
    return Boolean(result);
  }
}

export const callLogRepository = new CallLogRepository();
