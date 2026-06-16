import type { FilterQuery, UpdateQuery } from "mongoose";
import { User, type IUser, type UserDocument } from "../models/user.model.js";

export interface CreateUserInput {
  fullName: string;
  rollNumber: string;
  department: string;
  academicYear: number;
  email: string;
  password: string;
}

export interface IUserRepository {
  create(input: CreateUserInput): Promise<UserDocument>;
  findById(id: string, includePassword?: boolean): Promise<UserDocument | null>;
  findByEmail(email: string, includePassword?: boolean): Promise<UserDocument | null>;
  findByRollNumber(rollNumber: string): Promise<UserDocument | null>;
  updateById(id: string, update: UpdateQuery<IUser>): Promise<UserDocument | null>;
  search(query: string, excludeUserId?: string, limit?: number): Promise<UserDocument[]>;
}

export class UserRepository implements IUserRepository {
  create(input: CreateUserInput): Promise<UserDocument> {
    return User.create(input);
  }

  findById(id: string, includePassword = false): Promise<UserDocument | null> {
    const query = User.findById(id);
    if (includePassword) query.select("+password");
    return query.exec();
  }

  findByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select("+password");
    return query.exec();
  }

  findByRollNumber(rollNumber: string): Promise<UserDocument | null> {
    return User.findOne({ rollNumber: rollNumber.toUpperCase() }).exec();
  }

  updateById(id: string, update: UpdateQuery<IUser>): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
    }).exec();
  }

  findOne(filter: FilterQuery<IUser>): Promise<UserDocument | null> {
    return User.findOne(filter).exec();
  }

  search(query: string, excludeUserId?: string, limit = 20): Promise<UserDocument[]> {
    const filter: FilterQuery<IUser> = {
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { rollNumber: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ]
    };
    if (excludeUserId) filter._id = { $ne: excludeUserId };
    return User.find(filter).limit(limit).exec();
  }
}

export const userRepository = new UserRepository();
