import { describe, expect, it } from "vitest";
import { DiagnosisSessionModule } from "./DiagnosisSession";
import type { AiConversationDetail } from "../messaging/types";

describe("DiagnosisSession Domain Module", () => {
  const sampleSession: AiConversationDetail = {
    id: 1,
    status: "active",
    title: "Problema en cañería",
    responseStatus: "idle",
    diagnosisCompleted: true,
    assessment: {
      outcome: "professional_required",
      problemCategory: {
        id: 10,
        name: "Plomería",
      },
    },
    messages: [],
    recommendedProviders: [
      {
        id: 1,
        name: "Juan",
        surname: "Pérez",
        categoryName: "Plomería",
      },
    ],
    updatedOn: "2026-07-05T12:00:00Z",
  };

  describe("assessment checks", () => {
    it("identifies professional_required correctly", () => {
      expect(DiagnosisSessionModule.requiresProfessional(sampleSession)).toBe(true);
      expect(DiagnosisSessionModule.isSelfService(sampleSession)).toBe(false);
      expect(DiagnosisSessionModule.isCollectingInformation(sampleSession)).toBe(false);
    });

    it("identifies self_service correctly", () => {
      const selfService = {
        ...sampleSession,
        assessment: { outcome: "self_service" as const },
      };
      expect(DiagnosisSessionModule.requiresProfessional(selfService)).toBe(false);
      expect(DiagnosisSessionModule.isSelfService(selfService)).toBe(true);
      expect(DiagnosisSessionModule.isCollectingInformation(selfService)).toBe(false);
    });

    it("identifies collecting_information correctly", () => {
      const collecting = {
        ...sampleSession,
        assessment: { outcome: "collecting_information" as const },
      };
      expect(DiagnosisSessionModule.requiresProfessional(collecting)).toBe(false);
      expect(DiagnosisSessionModule.isSelfService(collecting)).toBe(false);
      expect(DiagnosisSessionModule.isCollectingInformation(collecting)).toBe(true);
    });
  });

  describe("diagnosisCompleted & providers", () => {
    it("checks diagnosis completion status", () => {
      expect(DiagnosisSessionModule.isDiagnosisCompleted(sampleSession)).toBe(true);
      expect(DiagnosisSessionModule.isDiagnosisCompleted({ diagnosisCompleted: false })).toBe(false);
    });

    it("checks recommended providers existence", () => {
      expect(DiagnosisSessionModule.hasRecommendedProviders(sampleSession)).toBe(true);
      expect(DiagnosisSessionModule.hasRecommendedProviders({ recommendedProviders: [] })).toBe(false);
    });
  });
});
