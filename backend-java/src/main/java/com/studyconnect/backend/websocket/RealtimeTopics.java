package com.studyconnect.backend.websocket;

public final class RealtimeTopics {
    private RealtimeTopics() {
    }

    public static final String COMMUNITY_MESSAGES = "/topic/community/";
    public static final String DIRECT_MESSAGES = "/topic/dm/";
    public static final String NOTIFICATIONS = "/topic/user/";

    public static String communityMessageCreated(String communityId) {
        return COMMUNITY_MESSAGES + communityId + "/messageCreated";
    }

    public static String communityMessageUpdated(String communityId) {
        return COMMUNITY_MESSAGES + communityId + "/messageUpdated";
    }

    public static String communityMessageDeleted(String communityId) {
        return COMMUNITY_MESSAGES + communityId + "/messageDeleted";
    }

    public static String directMessageConversationCreated() {
        return DIRECT_MESSAGES + "conversationCreated";
    }

    public static String directMessageCreated(String conversationId) {
        return DIRECT_MESSAGES + conversationId + "/directMessageCreated";
    }

    public static String directMessageUpdated(String conversationId) {
        return DIRECT_MESSAGES + conversationId + "/directMessageUpdated";
    }

    public static String directMessageDeleted(String conversationId) {
        return DIRECT_MESSAGES + conversationId + "/directMessageDeleted";
    }

    public static String directMessageRead(String conversationId) {
        return DIRECT_MESSAGES + conversationId + "/messageRead";
    }

    public static String directMessageTyping(String conversationId) {
        return DIRECT_MESSAGES + conversationId + "/userTyping";
    }

    public static String directMessageStoppedTyping(String conversationId) {
        return DIRECT_MESSAGES + conversationId + "/userStoppedTyping";
    }

    public static String notificationCreated(String userId) {
        return NOTIFICATIONS + userId + "/notificationCreated";
    }

    public static String notificationUpdated(String userId) {
        return NOTIFICATIONS + userId + "/notificationUpdated";
    }

    public static String notificationDeleted(String userId) {
        return NOTIFICATIONS + userId + "/notificationDeleted";
    }

    public static String notificationUnreadCount(String userId) {
        return NOTIFICATIONS + userId + "/unreadCountUpdate";
    }
}
