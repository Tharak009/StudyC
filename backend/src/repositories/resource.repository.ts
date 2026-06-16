import type { UpdateQuery } from "mongoose";
import { Resource, type IResource, type ResourceDocument } from "../models/resource.model.js";

export interface CreateResourceData {
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: IResource["category"];
  tags: string[];
  uploadedBy: string;
  communityId: string;
  visibility: IResource["visibility"];
}

export interface ResourceListOptions {
  communityId?: string;
  page: number;
  limit: number;
  search?: string;
  category?: string;
  tag?: string;
  sort?: "recent" | "downloads" | "name";
}

export class ResourceRepository {
  create(input: CreateResourceData): Promise<ResourceDocument> {
    return Resource.create(input);
  }

  findById(id: string): Promise<ResourceDocument | null> {
    return Resource.findById(id)
      .populate("uploadedBy", "fullName rollNumber profilePicture")
      .populate("communityId", "name slug")
      .exec();
  }

  async list({ communityId, page, limit, search, category, tag, sort }: ResourceListOptions) {
    const filter: Record<string, unknown> = {};
    if (communityId) filter.communityId = communityId;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } }
      ];
    }
    if (category) filter.category = category;
    if (tag) filter.tags = tag;

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "downloads") sortOption = { downloadCount: -1, createdAt: -1 };
    else if (sort === "name") sortOption = { title: 1 };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Resource.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "fullName rollNumber profilePicture")
        .exec(),
      Resource.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async incrementDownloadCount(id: string): Promise<ResourceDocument | null> {
    return Resource.findByIdAndUpdate(
      id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    ).exec();
  }

  updateById(id: string, update: UpdateQuery<IResource>): Promise<ResourceDocument | null> {
    return Resource.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("uploadedBy", "fullName rollNumber profilePicture")
      .populate("communityId", "name slug")
      .exec();
  }

  deleteById(id: string): Promise<ResourceDocument | null> {
    return Resource.findByIdAndDelete(id).exec();
  }
}

export const resourceRepository = new ResourceRepository();
