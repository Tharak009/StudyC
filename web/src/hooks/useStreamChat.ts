import { useContext } from "react";
import { StreamChatContext, type StreamChatContextValue } from "../providers/StreamChatProvider";

/**
 * Custom hook to access the Stream Chat client, connection status, and controls.
 * Must be used within a <StreamChatProvider>.
 */
export function useStreamChat(): StreamChatContextValue {
  const context = useContext(StreamChatContext);
  if (!context) {
    throw new Error("useStreamChat must be used within a <StreamChatProvider>");
  }
  return context;
}
