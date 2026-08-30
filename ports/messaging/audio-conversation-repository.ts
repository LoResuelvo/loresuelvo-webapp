export interface SendAudioMessagePayload {
  kind: "audio";
  audioFileId: string;
}

export interface AudioConversationRepository {
  sendAudioMessage(
    conversationId: string,
    payload: SendAudioMessagePayload
  ): Promise<unknown>;
}
