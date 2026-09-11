import { isValidObjectId } from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid user identifier");

export const targetUserIdParamsSchema = z.object({
  params: z.object({
    userId: objectId
  })
});
