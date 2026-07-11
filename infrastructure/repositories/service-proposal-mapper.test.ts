import { describe, expect, it } from "vitest";
import { transformApiToServiceProposal, transformApiToServiceProposalSummary } from "./service-proposal-mapper";
import { ApiServiceProposal, ApiServiceProposalSummary } from "@/infrastructure/api/types";

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

describe("transformApiToServiceProposalSummary", () => {
  it("transforms ApiServiceProposalSummary to ServiceProposalSummary successfully", () => {
    const apiModel: ApiServiceProposalSummary = {
      id: 1,
      conversation_id: 2,
      amount_cents: 1000,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "test description",
      status: "pending",
      created_on: "2026-07-04T10:00:00Z",
      counterpart: {
        id: 5,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
        category_name: "Plomería",
        profile_photo_url: "https://example.com/photo.jpg",
      },
    };

    const result = transformApiToServiceProposalSummary(apiModel);

    expect(result).toEqual({
      id: 1,
      conversationId: 2,
      amountCents: 1000,
      scheduledOn: "2026-07-05T09:30:00Z",
      description: "test description",
      status: "pending",
      createdOn: "2026-07-04T10:00:00Z",
      counterpart: {
        id: 5,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
        categoryName: "Plomería",
        profilePhotoUrl: "https://example.com/photo.jpg",
      },
    });
  });
});
