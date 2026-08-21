import { describe, expect, it } from "vitest";
import { ServiceProposalModule, ProposalStatus } from "./ServiceProposal";
import { ServiceProposal } from "./types";

describe("ServiceProposal Domain Module", () => {
  const sampleProposal: ServiceProposal = {
    id: 10,
    conversationId: 20,
    consumerId: 1,
    providerId: 2,
    amountCents: 1500000,
    scheduledOn: "2026-07-05T12:30:00.000Z",
    description: "Instalación de canilla",
    status: "pending",
  };

  describe("canBeAccepted", () => {
    it("allows consumer to accept pending proposal", () => {
      expect(ServiceProposalModule.canBeAccepted(sampleProposal, true)).toBe(true);
    });

    it("prevents provider from accepting proposal", () => {
      expect(ServiceProposalModule.canBeAccepted(sampleProposal, false)).toBe(false);
    });

    it("prevents consumer from accepting non-pending proposal", () => {
      const accepted = { ...sampleProposal, status: "accepted" as ProposalStatus };
      const rejected = { ...sampleProposal, status: "rejected" as ProposalStatus };

      expect(ServiceProposalModule.canBeAccepted(accepted, true)).toBe(false);
      expect(ServiceProposalModule.canBeAccepted(rejected, true)).toBe(false);
    });
  });

  describe("canBeRejected", () => {
    it("allows consumer to reject pending proposal", () => {
      expect(ServiceProposalModule.canBeRejected(sampleProposal, true)).toBe(true);
    });

    it("prevents provider from rejecting proposal", () => {
      expect(ServiceProposalModule.canBeRejected(sampleProposal, false)).toBe(false);
    });

    it("prevents rejecting non-pending proposal", () => {
      const accepted = { ...sampleProposal, status: "accepted" as ProposalStatus };
      expect(ServiceProposalModule.canBeRejected(accepted, true)).toBe(false);
    });
  });

  describe("status checks", () => {
    it("correctly identifies status predicates", () => {
      expect(ServiceProposalModule.isPending(sampleProposal)).toBe(true);
      expect(ServiceProposalModule.isAccepted(sampleProposal)).toBe(false);
      expect(ServiceProposalModule.isRejected(sampleProposal)).toBe(false);

      const accepted = { ...sampleProposal, status: "accepted" as ProposalStatus };
      expect(ServiceProposalModule.isPending(accepted)).toBe(false);
      expect(ServiceProposalModule.isAccepted(accepted)).toBe(true);

      const rejected = { ...sampleProposal, status: "rejected" as ProposalStatus };
      expect(ServiceProposalModule.isPending(rejected)).toBe(false);
      expect(ServiceProposalModule.isRejected(rejected)).toBe(true);
    });
  });

  describe("getStatusBadge", () => {
    it("returns warning badge for pending", () => {
      expect(ServiceProposalModule.getStatusBadge("pending")).toEqual({
        label: "Pendiente",
        variant: "warning",
      });
    });

    it("returns success badge for accepted", () => {
      expect(ServiceProposalModule.getStatusBadge("accepted")).toEqual({
        label: "Aceptada",
        variant: "success",
      });
    });

    it("returns destructive badge for rejected", () => {
      expect(ServiceProposalModule.getStatusBadge("rejected")).toEqual({
        label: "Rechazada",
        variant: "destructive",
      });
    });

    it("returns default badge for unknown status", () => {
      expect(ServiceProposalModule.getStatusBadge("unknown_status")).toEqual({
        label: "unknown_status",
        variant: "default",
      });
    });
  });
});
