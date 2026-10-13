import type { UpdateQuery } from "mongoose";
import { Resource, type IResource, type ResourceDocument } from "../models/resource.model.js";
import { User } from "../models/user.model.js";

export interface CreateResourceData {
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: IResource["category"];
  tags: string[];
  department?: string;
  semester?: string;
  subjectCode?: string;
  format?: string;
  rating?: number;
  reviewCount?: number;
  uploadedBy: string;
  communityId?: string;
  visibility: IResource["visibility"];
  contentHash?: string;
}

export interface ResourceListOptions {
  communityId?: string;
  page: number;
  limit: number;
  search?: string;
  category?: string;
  department?: string;
  dept?: string;
  semester?: string | number;
  format?: string;
  tag?: string;
  sort?: "recent" | "downloads" | "rating" | "name";
}

export class ResourceRepository {
  create(input: CreateResourceData): Promise<ResourceDocument> {
    return Resource.create(input);
  }

  findById(id: string): Promise<ResourceDocument | null> {
    return Resource.findById(id)
      .populate("uploadedBy", "fullName rollNumber profilePicture department")
      .populate("communityId", "name slug")
      .exec();
  }

  findByContentHash(contentHash: string): Promise<ResourceDocument | null> {
    return Resource.findOne({ contentHash })
      .populate("uploadedBy", "fullName rollNumber profilePicture department")
      .populate("communityId", "name slug")
      .exec();
  }

  async list({
    communityId,
    page = 1,
    limit = 20,
    search,
    category,
    department,
    dept,
    semester,
    format,
    tag,
    sort
  }: ResourceListOptions) {
    const filter: Record<string, unknown> = {};
    if (communityId) filter.communityId = communityId;

    // 1. Department Filter & Normalization
    const deptVal = (department || dept || "").trim();
    if (deptVal && deptVal !== "All Departments" && deptVal !== "all") {
      let deptRegex: RegExp;
      const dLower = deptVal.toLowerCase();
      if (dLower.includes("computer science") || dLower === "cse") {
        deptRegex = /computer science|cse/i;
      } else if (dLower.includes("artificial intelligence") || dLower.includes("data science") || dLower.includes("ai & ds") || dLower === "aids") {
        deptRegex = /artificial intelligence|data science|ai & ds|aids/i;
      } else if (dLower.includes("information technology") || dLower === "it") {
        deptRegex = /information technology|\bit\b/i;
      } else if (dLower.includes("electrical") || dLower === "eee") {
        deptRegex = /electrical|eee/i;
      } else if (dLower.includes("electronics") || dLower === "ece") {
        deptRegex = /electronics|ece/i;
      } else if (dLower.includes("mechanical") || dLower === "mech") {
        deptRegex = /mechanical|mech/i;
      } else {
        deptRegex = new RegExp(deptVal.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
      }

      const matchingUsers = await User.find({ department: deptRegex }, "_id").exec().catch(() => []);
      const matchingUserIds = matchingUsers.map((u) => u._id);

      filter.$and = filter.$and || [];
      (filter.$and as Array<any>).push({
        $or: [
          { department: deptRegex },
          {
            $and: [
              { $or: [{ department: { $exists: false } }, { department: null }, { department: "" }] },
              { uploadedBy: { $in: matchingUserIds } }
            ]
          }
        ]
      });
    }

    // 2. Semester Filter & Normalization
    const semVal = (semester !== undefined && semester !== null) ? String(semester).trim() : "";
    if (semVal && semVal !== "All Semesters" && semVal !== "all") {
      const numMatch = semVal.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        filter.semester = { $regex: new RegExp(`\\b(Sem|Semester)?\\s*${num}(st|nd|rd|th)?\\b`, "i") };
      } else {
        filter.semester = { $regex: new RegExp(semVal.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i") };
      }
    }

    // 3. Category Filter & Normalization
    const catVal = (category || "").trim();
    if (catVal && catVal !== "all" && catVal !== "All Categories") {
      let catRegex: RegExp;
      const lowerCat = catVal.toLowerCase();
      if (lowerCat.includes("lecture") || lowerCat.includes("notes") || catVal.toUpperCase() === "NOTES") {
        catRegex = /^(NOTES|Lecture Notes|Notes)$/i;
      } else if (lowerCat.includes("solved") || lowerCat.includes("paper") || catVal.toUpperCase() === "PREVIOUS_PAPERS") {
        catRegex = /^(PREVIOUS_PAPERS|Solved Papers|Previous Papers|Papers)$/i;
      } else if (lowerCat.includes("lab") || catVal.toUpperCase() === "LAB_RECORDS") {
        catRegex = /^(LAB_RECORDS|Lab Manuals|Lab Records|Lab)$/i;
      } else if (lowerCat.includes("cheat") || lowerCat.includes("assignment") || catVal.toUpperCase() === "ASSIGNMENTS") {
        catRegex = /^(ASSIGNMENTS|Cheat Sheets|Assignments)$/i;
      } else if (lowerCat.includes("presentation") || lowerCat.includes("ppt") || catVal.toUpperCase() === "PPTS") {
        catRegex = /^(PPTS|Presentations|PPT|PPTX)$/i;
      } else if (lowerCat.includes("question") || catVal.toUpperCase() === "QUESTION_BANKS") {
        catRegex = /^(QUESTION_BANKS|Question Banks|QBank)$/i;
      } else {
        catRegex = new RegExp(`^(${catVal.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}|OTHER)$`, "i");
      }

      filter.category = { $regex: catRegex };
    }

    // 4. Format Filter & Normalization
    const fmtVal = (format || "").trim().toLowerCase();
    if (fmtVal && fmtVal !== "all" && fmtVal !== "All Formats") {
      let formatOrList: Array<Record<string, unknown>> = [];
      if (fmtVal === "pdf") {
        formatOrList = [{ format: /^pdf$/i }, { fileName: /\.pdf$/i }, { fileType: /pdf/i }];
      } else if (fmtVal === "ipynb") {
        formatOrList = [{ format: /^ipynb$/i }, { fileName: /\.ipynb$/i }, { fileType: /ipynb|x-ipynb/i }];
      } else if (fmtVal === "zip") {
        formatOrList = [{ format: /^zip$/i }, { fileName: /\.(zip|tar|gz|7z|rar)$/i }, { fileType: /zip|compressed|tar/i }];
      } else if (fmtVal === "pptx") {
        formatOrList = [{ format: /^(pptx|ppt)$/i }, { fileName: /\.(pptx|ppt)$/i }, { fileType: /presentation|powerpoint/i }];
      } else if (fmtVal === "docx") {
        formatOrList = [{ format: /^(docx|doc)$/i }, { fileName: /\.(docx|doc)$/i }, { fileType: /word|wordprocessingml/i }];
      }
      if (formatOrList.length > 0) {
        filter.$and = filter.$and || [];
        (filter.$and as Array<any>).push({ $or: formatOrList });
      }
    }

    // 5. Search Filter
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");
      filter.$and = filter.$and || [];
      (filter.$and as Array<any>).push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { subjectCode: searchRegex },
          { fileName: searchRegex }
        ]
      });
    }

    if (tag) filter.tags = tag;

    // 6. Sorting Order
    let sortOption: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };
    if (sort === "downloads") sortOption = { downloadCount: -1, createdAt: -1 };
    else if (sort === "rating") sortOption = { rating: -1, reviewCount: -1, createdAt: -1 };
    else if (sort === "name") sortOption = { title: 1, createdAt: -1 };
    else if (sort === "recent") sortOption = { createdAt: -1, _id: -1 };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Resource.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "fullName rollNumber profilePicture department")
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

  async addRating(id: string, newRating: number): Promise<ResourceDocument | null> {
    const resource = await Resource.findById(id);
    if (!resource) return null;
    const currentRating = resource.rating || 5.0;
    const currentCount = resource.reviewCount || 1;
    const updatedCount = currentCount + 1;
    const updatedRating = Math.round(((currentRating * currentCount + newRating) / updatedCount) * 10) / 10;

    return Resource.findByIdAndUpdate(
      id,
      { $set: { rating: updatedRating, reviewCount: updatedCount } },
      { new: true }
    )
      .populate("uploadedBy", "fullName rollNumber profilePicture department")
      .populate("communityId", "name slug")
      .exec();
  }

  updateById(id: string, update: UpdateQuery<IResource>): Promise<ResourceDocument | null> {
    return Resource.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("uploadedBy", "fullName rollNumber profilePicture")
      .populate("communityId", "name slug")
      .exec();
  }

  async countOtherReferences(fileUrl: string, contentHash: string | undefined, excludeResourceId: string): Promise<number> {
    const conditions: Array<Record<string, unknown>> = [{ fileUrl }];
    if (contentHash) {
      conditions.push({ contentHash });
    }
    return Resource.countDocuments({
      _id: { $ne: excludeResourceId },
      $or: conditions
    });
  }

  deleteById(id: string): Promise<ResourceDocument | null> {
    return Resource.findByIdAndDelete(id).exec();
  }
}

export const resourceRepository = new ResourceRepository();
