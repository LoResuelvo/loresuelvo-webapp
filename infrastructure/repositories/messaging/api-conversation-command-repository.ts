import { api } from "@/infrastructure/api/base-client";
import { ApiConversation, ApiConversationMessage } from "@/infrastructure/api/types";
import { Message } from "@/domain/messaging/types";
import {
  ConversationCommandRepository,
  CreateConversationCommand,
  CreatedConversation,
  SendConversationAudioCommand,
  SendConversationMessageCommand,
} from "@/ports/messaging/conversation-command-repository";
import {
  createSyntheticMessage,
  transformApiMessageToDomain,
} from "./conversation-mapper";

export class ApiConversationCommandRepository implements ConversationCommandRepository {
  async create(command: CreateConversationCommand): Promise<CreatedConversation> {
    const payload: Record<string, unknown> = { counterpart_id: command.counterpartId };
    if (command.content !== undefined) payload.content = command.content;
    if (command.imageFileIds && command.imageFileIds.length > 0) {
      payload.image_file_ids = command.imageFileIds;
    }

    const res = await api.post<ApiConversation>("/conversations", payload);
    const conversationId = String(res.id);
    const message = res.last_message
      ? transformApiMessageToDomain(
          res.last_message,
          command.currentUserId,
          String(command.counterpartId),
          command.currentUserRole
        )
      : createSyntheticMessage(command.content, command.imageFileIds, command.currentUserId);

    return { conversationId, message };
  }

  async sendMessage(command: SendConversationMessageCommand): Promise<Message> {
    const payload: Record<string, unknown> = {};
    if (command.content !== undefined) payload.content = command.content;
    if (command.imageFileIds && command.imageFileIds.length > 0) {
      payload.image_file_ids = command.imageFileIds;
    }

    const res = await api.post<ApiConversationMessage>(
      `/conversations/${command.conversationId}/messages`,
      payload
    );

    return transformApiMessageToDomain(
      res,
      command.currentUserId,
      String(command.counterpartId),
      command.currentUserRole
    );
  }

  async sendAudioMessage(command: SendConversationAudioCommand): Promise<Message> {
    const res = await api.post<ApiConversationMessage>(
      `/conversations/${command.conversationId}/messages`,
      {
        audio_file_id: command.audioFileId,
      }
    );

    return transformApiMessageToDomain(
      res,
      command.currentUserId,
      String(command.counterpartId),
      command.currentUserRole
    );
  }
}
