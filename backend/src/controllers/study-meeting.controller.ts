import type { Request, Response } from "express";
import { studyMeetingService } from "../services/study-meeting.service.js";
import { ApiResponse } from "../utils/api-response.js";

const identity = (request: Request) => ({
  userId: request.user!.id,
  name: request.user!.name || request.user!.fullName || "StudyConnect member",
  avatar: (request.user as any)?.profilePicture as string | undefined
});

export class StudyMeetingController {
  async list(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.list(request.user!.id), "Study meetings retrieved"));
  }

  async details(request: Request, response: Response) {
    const code = typeof request.query.inviteCode === "string" ? request.query.inviteCode : undefined;
    response.json(new ApiResponse(200, await studyMeetingService.get(request.params.id as string, request.user!.id, code), "Study meeting retrieved"));
  }

  async create(request: Request, response: Response) {
    const result = await studyMeetingService.create(identity(request), request.body);
    response.status(201).json(new ApiResponse(201, result, "Study meeting created"));
  }

  async join(request: Request, response: Response) {
    const result = await studyMeetingService.join(request.params.id as string, identity(request), request.body.inviteCode);
    response.json(new ApiResponse(200, result, "Study meeting joined"));
  }

  async connected(request: Request, response: Response) {
    const meeting = await studyMeetingService.markConnected(request.params.id as string, request.user!.id);
    response.json(new ApiResponse(200, meeting, "Media connection established"));
  }

  async connectionState(request: Request, response: Response) {
    const meeting = await studyMeetingService.setConnectionState(request.params.id as string, request.user!.id, request.body.state);
    response.json(new ApiResponse(200, meeting, "Meeting connection state updated"));
  }

  async leave(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.leave(request.params.id as string, request.user!.id), "You left the study meeting"));
  }

  async removeParticipant(request: Request, response: Response) {
    const meeting = await studyMeetingService.removeParticipant(request.params.id as string, request.user!.id, request.body.userId);
    response.json(new ApiResponse(200, meeting, "Participant removed"));
  }

  async end(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.end(request.params.id as string, request.user!.id), "Study meeting ended"));
  }
}

export const studyMeetingController = new StudyMeetingController();
