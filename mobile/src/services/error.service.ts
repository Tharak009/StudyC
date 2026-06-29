import { AxiosError } from "axios";

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: any;
}

class ErrorService {
  handle(error: any): AppError {
    let message = "An unexpected error occurred. Please try again.";
    let code = "UNKNOWN_ERROR";
    let statusCode = 500;

    if (error && typeof error === "object") {
      // Axios / HTTP Errors
      if (error.isAxiosError || error instanceof AxiosError) {
        const response = error.response;
        statusCode = response?.status ?? 500;

        if (response?.data && typeof response.data === "object") {
          const body = response.data as any;
          message = body.message || message;
          code = body.code || code;
        } else if (error.code === "ECONNABORTED") {
          message = "Connection timeout. Please check your network.";
          code = "TIMEOUT";
        } else if (!response) {
          message = "Network error. Please check your internet connection.";
          code = "NETWORK_ERROR";
        }
      } 
      // Socket.IO Errors
      else if (error.type === "transport" || error.message?.includes("xhr poll error")) {
        message = "Real-time connection lost. Reconnecting...";
        code = "SOCKET_CONNECTION_ERROR";
      } 
      // General Javascript Errors
      else if (error instanceof Error) {
        message = error.message;
        code = "RUNTIME_ERROR";
      }
    }

    return {
      message,
      code,
      statusCode,
      originalError: error,
    };
  }

  getFriendlyMessage(error: any): string {
    return this.handle(error).message;
  }
}

export const errorService = new ErrorService();
