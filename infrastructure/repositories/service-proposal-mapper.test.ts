import { describe, expect, it } from "vitest";
import { transformApiToServiceProposal } from "./service-proposal-mapper";
import { ApiServiceProposal } from "@/infrastructure/api/types";

describe("transformApiToServiceProposal", () => {
  it("transforms ApiServiceProposal to ServiceProposal successfully", () => {
    const apiProposal: ApiServiceProposal = {
      id: 10,
      conversation_id: 25,
      consumer_id: 1,
      provider_id: 2,
      amount_cents: 1500050,
      scheduled_on: "2026-07-05T12:30:00Z",
      description: "Reparación de pérdida de agua...",
      status: "pending",
    };

    const domainProposal = transformApiToServiceProposal(apiProposal);

    expect(domainProposal).toEqual({
      id: 10,
      conversationId: 25,
      consumerId: 1,
      providerId: 2,
      amountCents: 1500050,
      scheduledOn: "2026-07-05T12:30:00Z",
      description: "Reparación de pérdida de agua...",
      status: "pending",
    });
  });
});
