import { describe, expect, it, beforeEach } from "vitest";
import {
  clearDraft,
  hasDraft,
  loadDraft,
  saveDraft,
  type DraftFileMeta,
} from "@/lib/message-drafts";

beforeEach(() => {
  clearDraft("conv-A");
  clearDraft("conv-B");
});

describe("message-drafts store", () => {
  it("returns an empty draft for a conversation that has no draft saved", () => {
    const draft = loadDraft("conv-A");
    expect(draft).toEqual({ text: "", files: [] });
  });

  it("preserves the text of a saved draft", () => {
    saveDraft("conv-A", "Hola, esto es un borrador", []);

    const draft = loadDraft("conv-A");
    expect(draft.text).toBe("Hola, esto es un borrador");
  });

  it("preserves the files metadata of a saved draft", () => {
    const files: DraftFileMeta[] = [
      { name: "foto.jpg", size: 12345, type: "image/jpeg" },
      { name: "doc.png", size: 67890, type: "image/png" },
    ];

    saveDraft("conv-A", "", files);

    const draft = loadDraft("conv-A");
    expect(draft.files).toEqual(files);
  });

  it("keeps drafts per conversation independent", () => {
    saveDraft("conv-A", "Texto A", [{ name: "a.jpg", size: 1, type: "image/jpeg" }]);
    saveDraft("conv-B", "Texto B", [{ name: "b.jpg", size: 2, type: "image/jpeg" }]);

    expect(loadDraft("conv-A").text).toBe("Texto A");
    expect(loadDraft("conv-A").files[0].name).toBe("a.jpg");
    expect(loadDraft("conv-B").text).toBe("Texto B");
    expect(loadDraft("conv-B").files[0].name).toBe("b.jpg");
  });

  it("clearDraft removes the saved draft", () => {
    saveDraft("conv-A", "Texto", []);
    expect(hasDraft("conv-A")).toBe(true);

    clearDraft("conv-A");

    expect(hasDraft("conv-A")).toBe(false);
    expect(loadDraft("conv-A")).toEqual({ text: "", files: [] });
  });

  it("overwrites a previous draft when saving again", () => {
    saveDraft("conv-A", "V1", []);
    saveDraft("conv-A", "V2", []);

    expect(loadDraft("conv-A").text).toBe("V2");
  });
});