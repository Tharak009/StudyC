import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";
import type { StreamChat } from "stream-chat";
import { streamChatService } from "../services/stream-chat.service";
import { streamApi, type StreamTokenResponse } from "../api/stream.api";
import { useAuthStore } from "../store/auth.store";
import { toStreamUserId } from "../utils/stream-id";

export type StreamConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface StreamChatContextValue {
  client: StreamChat | null;
  connectionStatus: StreamConnectionStatus;
  streamUser: StreamTokenResponse["user"] | null;
  error: string | null;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const StreamChatContext = createContext<StreamChatContextValue | null>(null);

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  const [client, setClient] = useState<StreamChat | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<StreamConnectionStatus>("idle");
  const [streamUser, setStreamUser] = useState<StreamTokenResponse["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // In-flight connection promise to prevent duplicate concurrent connects (e.g. React StrictMode)
  const connectingPromiseRef = useRef<Promise<void> | null>(null);
  // Track active target userId to avoid connecting to outdated target
  const activeUserIdRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    if (!user) {
      setConnectionStatus("idle");
      return;
    }

    const rawUserId = String(user._id);
    const streamUserId = toStreamUserId(rawUserId);

    // If already connecting with an active in-flight promise, reuse it
    if (connectingPromiseRef.current && activeUserIdRef.current === streamUserId) {
      return connectingPromiseRef.current;
    }

    activeUserIdRef.current = streamUserId;

    const connectionPromise = (async () => {
      try {
        setConnectionStatus("connecting");
        setError(null);

        const chatClient = streamChatService.getInstance();
        setClient(chatClient);

        // If client is already connected to the desired user, sync state and finish
        if (chatClient.userID === streamUserId) {
          setConnectionStatus("connected");
          return;
        }

        // If client is connected to a different user, disconnect first
        if (chatClient.userID && chatClient.userID !== streamUserId) {
          await chatClient.disconnectUser();
        }

        // Token provider callback: Stream Chat SDK invokes this for the initial token
        // and whenever the token expires, ensuring automatic token renewal without custom timers.
        const tokenProvider = async (): Promise<string> => {
          const res = await streamApi.getStreamToken();
          // Keep local streamUser state updated
          if (res.user) {
            setStreamUser(res.user);
          }
          return res.token;
        };

        // Fetch initial token to seed streamUser metadata & verify backend endpoint
        const initialData = await streamApi.getStreamToken();
        setStreamUser(initialData.user);

        // Connect user to Stream Chat
        await chatClient.connectUser(
          {
            id: streamUserId,
            name: user.fullName || "Student",
            image: user.profilePicture || undefined
          },
          tokenProvider
        );

        // Double-check that user hasn't switched during connection
        if (activeUserIdRef.current === streamUserId) {
          setConnectionStatus("connected");
          setError(null);
        }
      } catch (err: any) {
        console.error("Failed to connect user to Stream Chat:", err);
        if (activeUserIdRef.current === streamUserId) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            "Unable to connect to Stream Chat service";
          setError(msg);
          setConnectionStatus("error");
        }
      } finally {
        connectingPromiseRef.current = null;
      }
    })();

    connectingPromiseRef.current = connectionPromise;
    return connectionPromise;
  }, [user]);

  const disconnect = useCallback(async () => {
    activeUserIdRef.current = null;
    connectingPromiseRef.current = null;
    try {
      await streamChatService.disconnect();
    } finally {
      setConnectionStatus("disconnected");
      setStreamUser(null);
      setError(null);
    }
  }, []);

  const reconnect = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  // Connection lifecycle management tied to StudyConnect auth
  useEffect(() => {
    if (!initialized) return;

    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      // We do not eagerly disconnect here on every minor re-render,
      // but ensure state synchronization when user changes.
    };
  }, [initialized, user?._id, connect, disconnect]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Disconnect when provider unmounts completely
      streamChatService.disconnect();
    };
  }, []);

  const contextValue: StreamChatContextValue = {
    client,
    connectionStatus,
    streamUser,
    error,
    reconnect,
    disconnect
  };

  return (
    <StreamChatContext.Provider value={contextValue}>
      {children}
    </StreamChatContext.Provider>
  );
}
