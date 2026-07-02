package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.directmessage.ConversationDto;
import com.studyconnect.backend.dto.directmessage.ConversationLastMessageDto;
import com.studyconnect.backend.dto.directmessage.ConversationParticipantDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageAttachmentDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageReplyDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageReplySenderDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageSenderDto;
import com.studyconnect.backend.entity.Conversation;
import com.studyconnect.backend.entity.DirectMessage;
import com.studyconnect.backend.entity.User;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class DirectMessageMapper {

    private DirectMessageMapper() {
    }

    public static ConversationDto toConversationDto(Conversation conversation, List<User> participants) {
        Map<String, User> byId = participants.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(User::getId, Function.identity(), (left, right) -> left));
        List<ConversationParticipantDto> participantDtos = conversation.getParticipants().stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(user -> new ConversationParticipantDto(
                        user.getId(),
                        user.getFullName(),
                        user.getRollNumber(),
                        user.getProfilePicture(),
                        user.getDepartment()
                ))
                .toList();
        ConversationLastMessageDto lastMessage = conversation.getLastMessage() == null
                ? null
                : new ConversationLastMessageDto(
                        conversation.getLastMessage().getContent(),
                        conversation.getLastMessage().getSenderId(),
                        conversation.getLastMessage().getCreatedAt()
                );
        return new ConversationDto(
                conversation.getId(),
                participantDtos,
                lastMessage,
                conversation.getLastMessageAt(),
                conversation.getCreatedAt(),
                conversation.getUpdatedAt()
        );
    }

    public static DirectMessageDto toDirectMessageDto(
            DirectMessage message,
            User sender,
            DirectMessage reply,
            User replySender) {
        DirectMessageReplyDto replyDto = reply == null ? null : new DirectMessageReplyDto(
                reply.getId(),
                reply.getContent(),
                reply.isDeleted(),
                replySender == null ? null : new DirectMessageReplySenderDto(replySender.getId(), replySender.getFullName())
        );
        return new DirectMessageDto(
                message.getId(),
                message.getConversationId(),
                new DirectMessageSenderDto(
                        sender.getId(),
                        sender.getFullName(),
                        sender.getRollNumber(),
                        sender.getProfilePicture()
                ),
                message.getContent(),
                message.getMessageType(),
                attachmentDtos(message),
                replyDto,
                message.isEdited(),
                message.getEditedAt(),
                message.isRead(),
                message.getReadAt(),
                message.isDeleted(),
                message.getDeletedAt(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }

    private static List<DirectMessageAttachmentDto> attachmentDtos(DirectMessage message) {
        return message.getAttachments() == null
                ? List.of()
                : message.getAttachments().stream()
                        .map(attachment -> new DirectMessageAttachmentDto(
                                attachment.getKey(),
                                attachment.getUrl(),
                                attachment.getOriginalName(),
                                attachment.getMimeType(),
                                attachment.getSize()
                        ))
                        .toList();
    }
}
