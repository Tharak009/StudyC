import type { Request, Response } from "express";
import { adminService } from "../services/admin.service.js";
import { ApiResponse } from "../utils/api-response.js";

const param = (request: Request, name: string): string => request.params[name] as string;

export class AdminController {
  async dashboard(request: Request, response: Response) {
    const stats = await adminService.getDashboardStats();
    response.json(new ApiResponse(200, stats, "Dashboard stats retrieved"));
  }

  async listUsers(request: Request, response: Response) {
    const result = await adminService.listUsers(request.query as Record<string, string>);
    response.json(new ApiResponse(200, result, "Users retrieved"));
  }

  async getUser(request: Request, response: Response) {
    const user = await adminService.getUser(param(request, "userId"));
    response.json(new ApiResponse(200, user, "User retrieved"));
  }

  async banUser(request: Request, response: Response) {
    const user = await adminService.banUser(request.user!.id, param(request, "userId"));
    response.json(new ApiResponse(200, user, "User banned"));
  }

  async unbanUser(request: Request, response: Response) {
    const user = await adminService.unbanUser(request.user!.id, param(request, "userId"));
    response.json(new ApiResponse(200, user, "User unbanned"));
  }

  async activateUser(request: Request, response: Response) {
    const user = await adminService.activateUser(request.user!.id, param(request, "userId"));
    response.json(new ApiResponse(200, user, "User activated"));
  }

  async suspendUser(request: Request, response: Response) {
    const user = await adminService.suspendUser(request.user!.id, param(request, "userId"));
    response.json(new ApiResponse(200, user, "User suspended"));
  }

  async deleteUser(request: Request, response: Response) {
    await adminService.deleteUser(request.user!.id, param(request, "userId"));
    response.json(new ApiResponse(200, null, "User deleted"));
  }

  async listCommunities(request: Request, response: Response) {
    const result = await adminService.listCommunities(request.query as Record<string, string>);
    response.json(new ApiResponse(200, result, "Communities retrieved"));
  }

  async deleteCommunity(request: Request, response: Response) {
    await adminService.deleteCommunity(request.user!.id, param(request, "communityId"));
    response.json(new ApiResponse(200, null, "Community deleted"));
  }

  async listResources(request: Request, response: Response) {
    const result = await adminService.listResources(request.query as Record<string, string>);
    response.json(new ApiResponse(200, result, "Resources retrieved"));
  }

  async deleteResource(request: Request, response: Response) {
    await adminService.deleteResource(request.user!.id, param(request, "resourceId"));
    response.json(new ApiResponse(200, null, "Resource deleted"));
  }

  async listReports(request: Request, response: Response) {
    const result = await adminService.listReports(request.query as Record<string, string>);
    response.json(new ApiResponse(200, result, "Reports retrieved"));
  }

  async deleteMessage(request: Request, response: Response) {
    await adminService.deleteMessage(request.user!.id, param(request, "messageId"));
    response.json(new ApiResponse(200, null, "Message deleted"));
  }

  async deleteDirectMessage(request: Request, response: Response) {
    await adminService.deleteDirectMessage(request.user!.id, param(request, "messageId"));
    response.json(new ApiResponse(200, null, "Direct message deleted"));
  }

  async reviewReport(request: Request, response: Response) {
    const report = await adminService.reviewReport(request.user!.id, param(request, "reportId"), request.body);
    response.json(new ApiResponse(200, report, "Report reviewed"));
  }
}

export const adminController = new AdminController();
