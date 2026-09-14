import { Message } from "@/domain/messaging/types";
import {
  ConversationCommandRepository,
  CreateConversationCommand,
  CreatedConversation,
  SendConversationAudioCommand,
  SendConversationMessageCommand,
  SendConversationVideoCommand,
} from "@/ports/messaging/conversation-command-repository";

export interface ClientConversationCommandRepositoryActions {
  create: (command: CreateConversationCommand) => Promise<CreatedConversation>;
  sendMessage: (command: SendConversationMessageCommand) => Promise<Message>;
  sendAudioMessage?: (command: SendConversationAudioCommand) => Promise<Message>;
  sendVideoMessage?: (
    command: SendConversationVideoCommand
  ) => Promise<Message | { success: boolean; data?: Message; error?: string; status?: number }>;
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

  async sendVideoMessage(command: SendConversationVideoCommand): Promise<Message> {
    if (!this.actions.sendVideoMessage) {
      throw new Error("Video messaging is not configured for this repository");
    }
    const result = await this.actions.sendVideoMessage(command);
    if (result && typeof result === "object" && "success" in result) {
      if (!result.success) {
        const error = new Error(result.error || "Error al enviar video");
        if (result.status) {
          (error as unknown as { status: number }).status = result.status;
        }
        throw error;
      }
      return (result as { success: true; data: Message }).data;
    }
    return result as Message;
  }
}
