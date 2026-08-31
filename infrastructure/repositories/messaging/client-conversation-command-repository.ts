import { Message } from "@/domain/messaging/types";
import {
  ConversationCommandRepository,
  CreateConversationCommand,
  CreatedConversation,
  SendConversationAudioCommand,
  SendConversationMessageCommand,
} from "@/ports/messaging/conversation-command-repository";

export interface ClientConversationCommandRepositoryActions {
  create: (command: CreateConversationCommand) => Promise<CreatedConversation>;
  sendMessage: (command: SendConversationMessageCommand) => Promise<Message>;
  sendAudioMessage?: (command: SendConversationAudioCommand) => Promise<Message>;
}

export class ClientConversationCommandRepository implements ConversationCommandRepository {
  constructor(private actions: ClientConversationCommandRepositoryActions) {}

  async create(command: CreateConversationCommand): Promise<CreatedConversation> {
    return this.actions.create(command);
  }

  async sendMessage(command: SendConversationMessageCommand): Promise<Message> {
    return this.actions.sendMessage(command);
  }

  async sendAudioMessage(command: SendConversationAudioCommand): Promise<Message> {
    if (!this.actions.sendAudioMessage) {
      throw new Error("Audio messaging is not configured for this repository");
    }
    return this.actions.sendAudioMessage(command);
  }
}
