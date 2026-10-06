import { Types, type FilterQuery, type UpdateQuery } from "mongoose";
import { COMMUNITY_STATUS, type CommunityStatus } from "../constants/community.js";
import { Community, type CommunityDocument, type ICommunity } from "../models/community.model.js";

export interface CreateCommunityInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  banner?: string;
  bannerImage?: string;
  category: ICommunity["category"];
  type?: ICommunity["type"];
  tags: string[];
  visibility: ICommunity["visibility"];
  joinPolicy?: ICommunity["joinPolicy"];
  status?: ICommunity["status"];
  owner: string;
  collegeId?: string;
  memberCount?: number;
}

export interface CommunityListOptions {
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  includeArchived?: boolean;
  visibleCommunityIds?: string[];
  page: number;
  limit: number;
}

export class CommunityRepository {
  create(input: CreateCommunityInput): Promise<CommunityDocument> {
    return Community.create(input);
  }

  findById(id: string, includeDeleted = false): Promise<CommunityDocument | null> {
    const filter: FilterQuery<ICommunity> = { _id: id };
    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }
    return Community.findOne(filter).populate("owner", "fullName rollNumber profilePicture").exec();
  }

  findByName(name: string, includeDeleted = false): Promise<CommunityDocument | null> {
    const filter: FilterQuery<ICommunity> = {
      name: new RegExp(`^${escapeRegExp(name)}$`, "i")
    };
    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }
    return Community.findOne(filter).exec();
  }

  findBySlug(slug: string, includeDeleted = false): Promise<CommunityDocument | null> {
    const filter: FilterQuery<ICommunity> = { slug };
    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }
    return Community.findOne(filter).exec();
  }

  async list({
    search,
    category,
    type,
    status,
    includeArchived = true,
    visibleCommunityIds = [],
    page,
    limit
  }: CommunityListOptions) {
    const filter: FilterQuery<ICommunity> = {
      isDeleted: { $ne: true }
    };

    if (status) {
      filter.status = status;
    } else if (!includeArchived) {
      filter.status = COMMUNITY_STATUS.ACTIVE;
    } else {
      filter.status = { $ne: COMMUNITY_STATUS.DELETED };
    }

    filter.$or = [
      { visibility: { $in: ["PUBLIC", "public"] } },
      { _id: { $in: visibleCommunityIds } }
    ];

    if (category) filter.category = category;
    if (type) filter.type = type;
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

  archive(id: string, archivedBy: string): Promise<CommunityDocument | null> {
    return Community.findByIdAndUpdate(
      id,
      {
        $set: {
          status: COMMUNITY_STATUS.ARCHIVED,
          archivedAt: new Date(),
          archivedBy: new Types.ObjectId(archivedBy)
        }
      },
      { new: true, runValidators: true }
    )
      .populate("owner", "fullName rollNumber profilePicture")
      .exec();
  }

  restore(id: string): Promise<CommunityDocument | null> {
    return Community.findByIdAndUpdate(
      id,
      {
        $set: {
          status: COMMUNITY_STATUS.ACTIVE,
          archivedAt: null,
          archivedBy: null
        }
      },
      { new: true, runValidators: true }
    )
      .populate("owner", "fullName rollNumber profilePicture")
      .exec();
  }

  softDelete(id: string, deletedBy: string): Promise<CommunityDocument | null> {
    return Community.findByIdAndUpdate(
      id,
      {
        $set: {
          status: COMMUNITY_STATUS.DELETED,
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(deletedBy)
        }
      },
      { new: true }
    ).exec();
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
