import { FileRepository, PresignedUrlResponse, ConfirmUploadResponse } from "@/ports/file-repository";
import { ConversationRepository } from "@/ports/conversation-repository";
import { ConversationDetailInfo, ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";

export class ClientFileRepository implements FileRepository {
  async getPresignedUrl(
    originalName: string,
    mimeType: string,
    sizeBytes: number,
    purpose: string
  ): Promise<PresignedUrlResponse> {
    return getPresignedUrlAction(originalName, mimeType, sizeBytes, purpose);
  }

  async confirmUpload(
    fileId: string,
    key: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<ConfirmUploadResponse> {
    return confirmUploadAction(fileId, key, mimeType, sizeBytes);
  }

  async uploadFile(
    uploadUrl: string,
    file: File | Blob,
    headers: Record<string, string>
  ): Promise<void> {
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: headers,
    });
    if (!uploadRes.ok) {
      throw new Error("Error al subir archivo a S3/R2");
    }
  }
}

export class ClientConversationRepository implements ConversationRepository {
  constructor(
    private actions: {
      create: (counterpartId: number, content?: string, imageFileIds?: string[]) => Promise<{ id: number }>;
      sendMessage: (conversationId: string, content?: string, imageFileIds?: string[]) => Promise<unknown>;
    }
  ) {}

  async create(data: { counterpart_id: number; content?: string; image_file_ids?: string[] }): Promise<{ id: number }> {
    return this.actions.create(data.counterpart_id, data.content, data.image_file_ids);
  }

  async sendMessage(conversationId: string, content?: string, imageFileIds?: string[]): Promise<unknown> {
    return this.actions.sendMessage(conversationId, content, imageFileIds);
  }

  async getConsumerConversations(): Promise<ConsumerConversationContact[]> {
    throw new Error("getConsumerConversations not supported on client repository");
  }

  async getProviderConversations(): Promise<ProviderConversationContact[]> {
    throw new Error("getProviderConversations not supported on client repository");
  }

  async getById(id: string): Promise<ConversationDetailInfo> {
    throw new Error("getById not supported on client repository");
  }
}
