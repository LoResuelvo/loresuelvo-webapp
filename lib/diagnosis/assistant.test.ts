import { describe, expect, it } from "vitest";
import { getAssistantReply } from "@/lib/diagnosis/assistant";

describe("getAssistantReply", () => {
  it("devuelve la respuesta simulada para un mensaje del usuario", async () => {
    const reply = await getAssistantReply("Se está filtrando agua debajo de la bacha");
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
  });

  it("devuelve string vacío cuando el mensaje está vacío", async () => {
    const reply = await getAssistantReply("");
    expect(reply).toBe("");
  });
});
