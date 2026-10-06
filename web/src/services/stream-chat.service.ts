import { StreamChat } from "stream-chat";

let clientInstance: StreamChat | null = null;

export const streamChatService = {
  /**
   * Retrieves or initializes the singleton StreamChat client instance
   */
  getInstance: (apiKeyOverride?: string): StreamChat => {
    const apiKey = apiKeyOverride || import.meta.env.VITE_STREAM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Stream Chat API Key is not configured. Ensure VITE_STREAM_API_KEY is defined."
      );
    }

    if (!clientInstance) {
      clientInstance = StreamChat.getInstance(apiKey, {
        timeout: 30000
      });
    }
    return clientInstance;
  },

  /**
   * Returns the current client instance if one exists
   */
  getCurrentClient: (): StreamChat | null => {
    return clientInstance;
  },

  /**
   * Disconnects the current user if connected
   */
  disconnect: async (): Promise<void> => {
    if (clientInstance) {
      try {
        await clientInstance.disconnectUser();
      } catch (err) {
        console.warn("Error during Stream client disconnect:", err);
      }
    }
  },

  /**
   * Resets the singleton instance (e.g. for testing or full cleanup)
   */
  reset: async (): Promise<void> => {
    await streamChatService.disconnect();
    clientInstance = null;
  }
};
