import axios from "axios";
import type { ApiErrorBody } from "../types/auth";

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? "The request could not be completed.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};

export const getFieldError = (error: unknown, field: string): string | undefined => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return undefined;
  return error.response?.data?.errors?.find((item) => item.field === field)?.message;
};
