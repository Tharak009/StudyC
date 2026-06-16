import { useEffect } from "react";
import { socketService } from "../services/socket.service";
import { useNotificationStore } from "../store/notification.store";

export function useSocketNotifications() {
  const incrementUnread = useNotificationStore((state) => state.incrementUnread);
  const decrementUnread = useNotificationStore((state) => state.decrementUnread);

  useEffect(() => {
    const socket = socketService.get();
    if (!socket) return;

    const handleCreated = () => {
      incrementUnread();
    };

    const handleUpdated = () => {
      // Notification content updated — could refresh list
    };

    const handleDeleted = () => {
      decrementUnread();
    };

    const handleUnreadCount = (payload: { count: number }) => {
      useNotificationStore.getState().setUnreadCount(payload.count);
    };

    socket.emit("subscribeNotifications");
    socket.on("notificationCreated", handleCreated);
    socket.on("notificationUpdated", handleUpdated);
    socket.on("notificationDeleted", handleDeleted);
    socket.on("unreadCountUpdate", handleUnreadCount);

    return () => {
      socket.off("notificationCreated", handleCreated);
      socket.off("notificationUpdated", handleUpdated);
      socket.off("notificationDeleted", handleDeleted);
      socket.off("unreadCountUpdate", handleUnreadCount);
    };
  }, [incrementUnread, decrementUnread]);
}
