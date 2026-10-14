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
    response.json(new ApiResponse(200, await studyMeetingService.list(request.user!.id, (request.validated?.query || request.query) as any), "Study meetings retrieved"));
  }

  async history(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.history(request.user!.id, (request.validated?.query || request.query) as any), "Study meeting history retrieved"));
  }

  async details(request: Request, response: Response) {
    const code = (request.validated?.query as { inviteCode?: string } | undefined)?.inviteCode;
    response.json(new ApiResponse(200, await studyMeetingService.get(request.params.id as string, request.user!.id, code), "Study meeting retrieved"));
  }

  async create(request: Request, response: Response) {
    const result = await studyMeetingService.create(identity(request), request.body);
    response.status(201).json(new ApiResponse(201, result, "Study meeting created"));
  }

  async update(request: Request, response: Response) {
    const result = await studyMeetingService.update(request.params.id as string, request.user!.id, request.body);
    response.json(new ApiResponse(200, result, "Scheduled meeting updated"));
  }

  async cancel(request: Request, response: Response) {
    const result = await studyMeetingService.cancel(request.params.id as string, request.user!.id);
    response.json(new ApiResponse(200, result, "Study meeting cancelled"));
  }

  async join(request: Request, response: Response) {
    const result = await studyMeetingService.join(request.params.id as string, identity(request), request.body.inviteCode);
    response.json(new ApiResponse(200, result, "Study meeting joined"));
  }

  async resolveInvitation(request: Request, response: Response) {
    const result = await studyMeetingService.resolveInvitation(request.body.code, identity(request));
    response.json(new ApiResponse(200, result, "Invitation resolved"));
  }

  async admissionRequests(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.admissionRequests(request.params.id as string, request.user!.id), "Admission requests retrieved"));
  }

  async admissionStatus(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.admissionStatus(request.params.id as string, request.user!.id), "Admission status retrieved"));
  }

  async decideAdmission(request: Request, response: Response) {
    const result = await studyMeetingService.decideAdmission(request.params.id as string, request.user!.id, request.params.userId as string, request.body.decision);
    response.json(new ApiResponse(200, result, "Admission request updated"));
  }

  async cancelAdmissionRequest(request: Request, response: Response) {
    response.json(new ApiResponse(200, await studyMeetingService.cancelAdmissionRequest(request.params.id as string, request.user!.id), "Admission request cancelled"));
  }

  async connected(request: Request, response: Response) {
    const meeting = await studyMeetingService.markConnected(request.params.id as string, request.user!.id);
    response.json(new ApiResponse(200, meeting, "LiveKit participant presence confirmed"));
  }

  async connectionState(request: Request, response: Response) {
    const meeting = await studyMeetingService.setConnectionState(request.params.id as string, request.user!.id, request.body.state);
    response.json(new ApiResponse(200, meeting, "Meeting connection state updated"));
  }

  async heartbeat(request: Request, response: Response) {
    const result = await studyMeetingService.heartbeat(request.params.id as string, request.user!.id);
    response.json(new ApiResponse(200, result, "Meeting presence refreshed"));
  }

  async mediaState(request: Request, response: Response) {
    const meeting = await studyMeetingService.updateMediaState(request.params.id as string, request.user!.id, request.body);
    response.json(new ApiResponse(200, meeting, "Meeting media state synchronized"));
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
