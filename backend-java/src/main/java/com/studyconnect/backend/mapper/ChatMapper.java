package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.chat.ChatAttachmentDto;
import com.studyconnect.backend.dto.chat.ChatMessageDto;
import com.studyconnect.backend.dto.chat.ChatReplyDto;
import com.studyconnect.backend.dto.community.CommunityUserDto;
import com.studyconnect.backend.entity.Message;
import com.studyconnect.backend.entity.User;
import java.util.List;
import java.util.stream.Stream;

public final class ChatMapper {

    private ChatMapper() {
    }

    public static ChatMessageDto toDto(Message message, User sender, Message replyTo, User replySender) {
        return new ChatMessageDto(
                message.getId(),
                message.getCommunityId(),
                CommunityMapper.toUserSummary(sender, false),
                message.getContent(),
                message.getMessageType(),
                attachmentStream(message)
                        .map(attachment -> new ChatAttachmentDto(
                                attachment.getKey(),
                                attachment.getUrl(),
                                attachment.getOriginalName(),
                                attachment.getMimeType(),
                                attachment.getSize()))
                        .toList(),
                replyTo == null ? null : new ChatReplyDto(
                        replyTo.getId(),
                        replyTo.getContent(),
                        replyTo.isDeleted(),
                        replySender == null ? null : new CommunityUserDto(
                                replySender.getId(),
                                replySender.getFullName(),
                                replySender.getRollNumber(),
                                null,
                                null,
                                replySender.getProfilePicture())),
                message.isEdited(),
                message.getEditedAt(),
                message.isDeleted(),
                message.getDeletedAt(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }

    private static Stream<Message.MessageAttachment> attachmentStream(Message message) {
        return message.getAttachments() == null ? Stream.empty() : message.getAttachments().stream();
    }
}
