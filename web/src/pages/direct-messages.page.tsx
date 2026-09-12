import React from "react";
import { useParams, Navigate } from "react-router";

export function DirectMessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  if (conversationId) {
    return <Navigate to={`/chat?mode=dms&conv=${conversationId}`} replace />;
  }
  return <Navigate to="/chat?mode=dms" replace />;
}

export default DirectMessagesPage;
