import { useEffect, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft, type DraftFileMeta } from "@/lib/messaging/message-drafts";

function fileToMeta(file: File): DraftFileMeta {
  return { name: file.name, size: file.size, type: file.type };
}

function metaToFile(meta: DraftFileMeta): File {
  return new File([new Blob([])], meta.name, { type: meta.type });
}

interface UseConversationDraftConfig {
  conversationId: string | undefined;
  isSending: boolean;
}

export function useConversationDraft({ conversationId, isSending }: UseConversationDraftConfig) {
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const draftWasJustLoadedRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;

    const draft = loadDraft(conversationId);
    setMessageInput(draft.text);
    setAttachedFiles(draft.files.map(metaToFile));
    draftWasJustLoadedRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || isSending) return;
    if (draftWasJustLoadedRef.current) {
      draftWasJustLoadedRef.current = false;
      return;
    }

    if (messageInput || attachedFiles.length > 0) {
      saveDraft(conversationId, messageInput, attachedFiles.map(fileToMeta));
    } else {
      clearDraft(conversationId);
    }
  }, [attachedFiles, conversationId, isSending, messageInput]);

  return {
    messageInput,
    setMessageInput,
    attachedFiles,
    setAttachedFiles,
    clearConversationDraft: (id: string) => clearDraft(id),
  };
}
