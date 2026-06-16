import type { FilterQuery, UpdateQuery } from "mongoose";
import { Community, type CommunityDocument, type ICommunity } from "../models/community.model.js";

export interface CreateCommunityInput {
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  category: ICommunity["category"];
  tags: string[];
  visibility: ICommunity["visibility"];
  owner: string;
  memberCount?: number;
}

export interface CommunityListOptions {
  search?: string;
  category?: string;
  visibleCommunityIds?: string[];
  page: number;
  limit: number;
}

export class CommunityRepository {
  create(input: CreateCommunityInput): Promise<CommunityDocument> {
    return Community.create(input);
  }

  findById(id: string): Promise<CommunityDocument | null> {
    return Community.findById(id).populate("owner", "fullName rollNumber profilePicture").exec();
  }

  findByName(name: string): Promise<CommunityDocument | null> {
    return Community.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, "i") }).exec();
  }

  findBySlug(slug: string): Promise<CommunityDocument | null> {
    return Community.findOne({ slug }).exec();
  }

  async list({ search, category, visibleCommunityIds = [], page, limit }: CommunityListOptions) {
    const filter: FilterQuery<ICommunity> = {};
    filter.$or = [{ visibility: "public" }, { _id: { $in: visibleCommunityIds } }];
    if (category) filter.category = category;
    if (search) {
      const pattern = new RegExp(escapeRegExp(search), "i");
      filter.$and = [{ $or: [{ name: pattern }, { description: pattern }, { tags: pattern }] }];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Community.find(filter)
        .sort({ memberCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("owner", "fullName rollNumber profilePicture")
        .exec(),
      Community.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  updateById(id: string, update: UpdateQuery<ICommunity>): Promise<CommunityDocument | null> {
    return Community.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("owner", "fullName rollNumber profilePicture")
      .exec();
  }

  deleteById(id: string): Promise<CommunityDocument | null> {
    return Community.findByIdAndDelete(id).exec();
  }

  incrementMemberCount(id: string, amount: 1 | -1): Promise<CommunityDocument | null> {
    return Community.findByIdAndUpdate(
      id,
      { $inc: { memberCount: amount } },
      { new: true, runValidators: true }
    ).exec();
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const communityRepository = new CommunityRepository();
