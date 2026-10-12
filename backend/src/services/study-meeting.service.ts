import mongoose, { Types } from "mongoose";
import { randomBytes, randomUUID } from "node:crypto";
import { StudyMeeting, type IStudyMeeting, type StudyMeetingAccess, type StudyMeetingDocument } from "../models/study-meeting.model.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { liveKitService } from "./livekit.service.js";
import { streamService } from "./stream.service.js";

type Identity = { userId: string; name: string; avatar?: string };
const activeCount = (meeting: IStudyMeeting) => meeting.participants.filter((p) => p.state === "JOINED").length;

function publicMeeting(meeting: any) {
  const data = meeting.toObject ? meeting.toObject() : { ...meeting };
  delete data.inviteCode;
  delete data.liveKitRoomName;
  delete data.deniedUsers;
  return data;
}

export class StudyMeetingService {
  async list(userId: string) {
    return (await StudyMeeting.find({
      status: { $ne: "ENDED" },
      deniedUsers: { $ne: new Types.ObjectId(userId) },
      $or: [{ access: "PUBLIC" }, { createdBy: new Types.ObjectId(userId) }, { "participants.userId": new Types.ObjectId(userId) }]
    }).sort({ createdAt: -1 }).limit(100).lean().exec()).map(publicMeeting);
  }

  async get(id: string, userId: string, inviteCode?: string) {
    const meeting = await this.findById(id, true);
    this.assertNotDenied(meeting, userId);
    this.assertCanView(meeting, userId, inviteCode);
    const result = publicMeeting(meeting);
    if (String(meeting.createdBy) === userId && meeting.inviteCode) result.inviteCode = meeting.inviteCode;
    return result;
  }

  async create(identity: Identity, input: {
    title: string; description?: string; access: StudyMeetingAccess; mediaType: "voice" | "video"; capacity: number;
  }) {
    if (!liveKitService.isConfigured()) {
      throw new ApiError(503, "Study meetings are unavailable because group media is not configured", [], "LIVEKIT_NOT_CONFIGURED");
    }
    if (!streamService.isConfigured()) {
      throw new ApiError(503, "Study meeting chat is unavailable because Stream Chat is not configured", [], "STREAM_NOT_CONFIGURED");
    }
    const meetingId = new Types.ObjectId();
    const suffix = randomUUID().replace(/-/g, "");
    const liveKitRoomName = `study_${suffix}`;
    const streamChannelId = `study_${suffix}`;
    const access = input.access;
    const inviteCode = access === "PUBLIC" ? undefined : randomBytes(18).toString("base64url");
    const meeting = await StudyMeeting.create({
      _id: meetingId,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      createdBy: new Types.ObjectId(identity.userId),
      access,
      ...(inviteCode ? { inviteCode } : {}),
      status: "WAITING",
      mediaType: input.mediaType,
      capacity: Math.min(input.capacity, env.GROUP_CALL_MAX_PARTICIPANTS),
      liveKitRoomName,
      streamChannelId,
      participants: []
    });

    try {
      await streamService.createStudyMeetingChannel({
        channelId: streamChannelId,
        meetingId: meetingId.toString(),
        name: input.title.trim(),
        hostUserId: identity.userId
      });
      return { meeting: publicMeeting(meeting), inviteCode };
    } catch (error) {
      await StudyMeeting.deleteOne({ _id: meetingId });
      await liveKitService.endMeetingRoom(liveKitRoomName);
      throw error;
    }
  }

  async join(id: string, identity: Identity, inviteCode?: string) {
    if (!liveKitService.isConfigured()) {
      throw new ApiError(503, "Study meetings are unavailable because group media is not configured", [], "LIVEKIT_NOT_CONFIGURED");
    }
    const meeting = await this.findById(id, true);
    if (meeting.deniedUsers.some((memberId) => String(memberId) === identity.userId)) {
      throw new ApiError(403, "You are no longer allowed to join this meeting", [], "MEETING_ACCESS_DENIED");
    }
    this.assertCanView(meeting, identity.userId, inviteCode);
    if (meeting.status === "ENDED") throw new ApiError(410, "This meeting has ended", [], "MEETING_ENDED");
    const participant = meeting.participants.find((p) => String(p.userId) === identity.userId);
    if (participant?.state === "JOINED") {
      participant.name = identity.name;
      participant.avatar = identity.avatar;
      participant.connectionState = "CONNECTING";
      await meeting.save();
      return this.issueJoinCredentials(meeting, participant);
    }
    if (participant?.state === "LEFT") {
      const rejoined = await StudyMeeting.findOneAndUpdate({
        _id: meeting._id,
        status: { $ne: "ENDED" },
        "participants.userId": new Types.ObjectId(identity.userId),
        "participants.state": "LEFT",
        $expr: { $lt: [
          { $size: { $filter: { input: "$participants", as: "p", cond: { $eq: ["$$p.state", "JOINED"] } } } },
          "$capacity"
        ] }
      }, {
        $set: {
          "participants.$[member].state": "JOINED",
          "participants.$[member].name": identity.name,
          "participants.$[member].avatar": identity.avatar,
          "participants.$[member].joinedAt": new Date(),
          "participants.$[member].leftAt": null,
          "participants.$[member].connectionState": "CONNECTING",
          "participants.$[member].audioEnabled": true,
          "participants.$[member].videoEnabled": false,
          status: "ACTIVE"
        }
      }, { new: true, arrayFilters: [{ "member.userId": new Types.ObjectId(identity.userId), "member.state": "LEFT" }] }).exec();
      if (!rejoined) throw new ApiError(409, "This meeting is full", [], "MEETING_FULL");
      const restored = rejoined.participants.find((item) => String(item.userId) === identity.userId)!;
      await streamService.addStudyMeetingMember(rejoined.streamChannelId, identity.userId);
      return this.issueJoinCredentials(rejoined, restored);
    }

    // The capacity predicate and participant append execute in one Mongo update,
    // so concurrent joins cannot exceed the configured limit.
    const joinedCountExpression = {
      $size: { $filter: { input: "$participants", as: "p", cond: { $eq: ["$$p.state", "JOINED"] } } }
    };
    const joined = await StudyMeeting.findOneAndUpdate({
      _id: meeting._id,
      status: { $ne: "ENDED" },
      "participants.userId": { $ne: new Types.ObjectId(identity.userId) },
      $expr: { $lt: [joinedCountExpression, "$capacity"] }
    }, {
      $push: { participants: {
        userId: new Types.ObjectId(identity.userId),
        name: identity.name,
        avatar: identity.avatar,
        role: String(meeting.createdBy) === identity.userId ? "HOST" : "PARTICIPANT",
        state: "JOINED",
        joinedAt: new Date(),
        audioEnabled: true,
        videoEnabled: false,
        connectionState: "CONNECTING"
      } },
      $set: { status: "ACTIVE" }
    }, { new: true }).exec();
    if (!joined) {
      const latest = await this.findById(id, true);
      if (latest.status === "ENDED") throw new ApiError(410, "This meeting has ended", [], "MEETING_ENDED");
      if (latest.participants.some((p) => String(p.userId) === identity.userId && p.state === "JOINED")) {
        const existing = latest.participants.find((p) => String(p.userId) === identity.userId)!;
        return this.issueJoinCredentials(latest, existing);
      }
      throw new ApiError(409, "This meeting is full", [], "MEETING_FULL");
    }
    const added = joined.participants.find((p) => String(p.userId) === identity.userId)!;
    try {
      await streamService.addStudyMeetingMember(joined.streamChannelId, identity.userId);
    } catch (error) {
      await StudyMeeting.updateOne({ _id: joined._id }, { $pull: { participants: { userId: new Types.ObjectId(identity.userId), state: "JOINED" } } });
      throw error;
    }
    return this.issueJoinCredentials(joined, added);
  }

  async markConnected(id: string, userId: string) {
    const meeting = await this.findById(id);
    const participant = meeting.participants.find((p) => String(p.userId) === userId && p.state === "JOINED");
    if (!participant || meeting.status === "ENDED") throw new ApiError(403, "You are not an active meeting participant", [], "MEETING_ACCESS_DENIED");
    participant.connectionState = "CONNECTED";
    meeting.status = "ACTIVE";
    await meeting.save();
    return publicMeeting(meeting);
  }

  async setConnectionState(id: string, userId: string, state: "CONNECTED" | "RECONNECTING") {
    const meeting = await this.findById(id);
    const participant = meeting.participants.find((p) => String(p.userId) === userId && p.state === "JOINED");
    if (!participant || meeting.status === "ENDED") throw new ApiError(403, "You are not an active meeting participant", [], "MEETING_ACCESS_DENIED");
    participant.connectionState = state;
    await meeting.save();
    return publicMeeting(meeting);
  }

  async leave(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    if (meeting.status === "ENDED") return publicMeeting(meeting);
    const participant = meeting.participants.find((p) => String(p.userId) === userId && p.state === "JOINED");
    if (!participant) return publicMeeting(meeting);
    participant.state = "LEFT";
    participant.leftAt = new Date();
    participant.connectionState = "CONNECTING";
    await meeting.save();
    await liveKitService.removeMeetingParticipant(meeting.liveKitRoomName, userId);
    if (activeCount(meeting) === 0) {
      meeting.status = "WAITING";
      await meeting.save();
    }
    return publicMeeting(meeting);
  }

  async removeParticipant(id: string, hostId: string, targetUserId: string) {
    const meeting = await this.findById(id, true);
    if (String(meeting.createdBy) !== hostId) throw new ApiError(403, "Only the host can remove meeting participants", [], "FORBIDDEN");
    if (targetUserId === hostId) throw new ApiError(400, "The host cannot remove themself", [], "INVALID_PARTICIPANT");
    const participant = meeting.participants.find((p) => String(p.userId) === targetUserId && p.state === "JOINED");
    if (!participant) throw new ApiError(404, "Active participant not found", [], "PARTICIPANT_NOT_FOUND");
    participant.state = "LEFT";
    participant.leftAt = new Date();
    if (!meeting.deniedUsers.some((memberId) => String(memberId) === targetUserId)) {
      meeting.deniedUsers.push(new Types.ObjectId(targetUserId));
    }
    await meeting.save();
    await liveKitService.removeMeetingParticipant(meeting.liveKitRoomName, targetUserId);
    await streamService.removeStudyMeetingMember(meeting.streamChannelId, targetUserId);
    return publicMeeting(meeting);
  }

  async end(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    if (String(meeting.createdBy) !== userId) throw new ApiError(403, "Only the host can end this meeting", [], "FORBIDDEN");
    if (meeting.status === "ENDED") return publicMeeting(meeting);
    meeting.status = "ENDED";
    meeting.endedAt = new Date();
    meeting.endReason = "host_ended";
    meeting.participants.forEach((participant) => {
      if (participant.state === "JOINED") {
        participant.state = "LEFT";
        participant.leftAt = meeting.endedAt;
      }
    });
    await meeting.save();
    await liveKitService.endMeetingRoom(meeting.liveKitRoomName);
    return publicMeeting(meeting);
  }

  private async issueJoinCredentials(meeting: StudyMeetingDocument, participant: IStudyMeeting["participants"][number]) {
    await liveKitService.prepareMeetingRoom({ roomName: meeting.liveKitRoomName, meetingId: String(meeting._id), maxParticipants: meeting.capacity });
    const media = await liveKitService.issueMeetingToken({
      roomName: meeting.liveKitRoomName,
      userId: String(participant.userId),
      displayName: participant.name,
      role: participant.role,
      mediaType: meeting.mediaType,
      maxParticipants: meeting.capacity
    });
    return { meeting: publicMeeting(meeting), media };
  }

  private async findById(id: string, includeSecrets = false) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid meeting identifier", [], "INVALID_MEETING_ID");
    const query = StudyMeeting.findById(id);
    if (includeSecrets) query.select("+inviteCode +liveKitRoomName");
    const meeting = await query.exec();
    if (!meeting) throw new ApiError(404, "Meeting not found", [], "MEETING_NOT_FOUND");
    return meeting;
  }

  private assertCanView(meeting: any, userId: string, inviteCode?: string) {
    if (meeting.access === "PUBLIC" || String(meeting.createdBy) === userId || meeting.participants.some((p: any) => String(p.userId) === userId)) return;
    if (meeting.inviteCode && inviteCode && meeting.inviteCode === inviteCode) return;
    throw new ApiError(403, "This meeting is private or requires a valid invitation", [], "MEETING_ACCESS_DENIED");
  }

  private assertNotDenied(meeting: any, userId: string) {
    if (meeting.deniedUsers?.some((memberId: Types.ObjectId) => String(memberId) === userId)) {
      throw new ApiError(403, "You are no longer allowed to access this meeting", [], "MEETING_ACCESS_DENIED");
    }
  }
}

export const studyMeetingService = new StudyMeetingService();
