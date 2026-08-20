import { AuthSession } from "../../infrastructure/auth/types";
import {
  Category,
  ApiProvider,
  ApiConversation,
  ApiConversationMessage,
} from "../../infrastructure/api/types";

export interface MockCounterpart {
  id: number;
  role: "consumer" | "provider";
  name: string;
  surname: string;
  category_name?: string;
  profile_photo_url?: string;
}

export interface MockProposalStub {
  id: number;
  conversation_id: number;
  consumer_id: number;
  provider_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_on: string;
  counterpart?: MockCounterpart;
}

export interface MockCompletionImage {
  file_id: string;
  original_name: string;
  url: string;
}

export interface MockCompletionReport {
  id: number;
  description: string;
  reported_on: string;
  images: MockCompletionImage[];
}

export interface MockReview {
  rating: number;
  description?: string;
  comment?: string;
}

export interface MockWorkOrderStub {
  id: number;
  service_proposal_id: number;
  consumer_id?: number;
  provider_id?: number;
  status: "scheduled" | "awaiting_payment" | "paid";
  amount_cents: number;
  scheduled_on: string;
  description: string;
  accepted_on: string;
  paid_on?: string;
  completion_report?: MockCompletionReport;
  review?: MockReview;
}

// ----------------------------------------------------------------------------
// FACTORIES
// ----------------------------------------------------------------------------

export function aSession(
  role: "consumer" | "provider" = "consumer",
  overrides: Partial<AuthSession["user"]> = {}
): AuthSession {
  return {
    user: {
      id: role === "consumer" ? "consumer-001" : "provider-001",
      email: role === "consumer" ? "consumidor@loresuelvo.test" : "prestador@loresuelvo.test",
      firstName: role === "consumer" ? "Ana" : "Juan",
      lastName: role === "consumer" ? "Pérez" : "Gómez",
      isOnboarded: true,
      role,
      ...overrides,
    },
    accessToken: "mock-access-token",
  };
}

export function aCategory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Plomería",
    description: "Servicios de plomería y cañerías",
    icon_url: "http://localhost:3001/icons/plomeria.png",
    ...overrides,
  };
}

export function aProvider(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Juan",
    surname: "Gómez",
    category_name: "Plomería",
    category_id: 1,
    description: "Plomero matriculado con más de 10 años de experiencia",
    rating: 4.8,
    reviews: 12,
    jobs: 25,
    profile_photo_url: "http://localhost:3001/mock-avatar.png",
    ...overrides,
  };
}

export function aProposal(
  role: "consumer" | "provider" = "consumer",
  overrides: Partial<MockProposalStub> = {}
): MockProposalStub {
  return {
    id: 42,
    conversation_id: 1,
    consumer_id: 10,
    provider_id: 1,
    amount_cents: 1500000,
    scheduled_on: "2026-08-20T10:00:00Z",
    description: "Reparación de cañería en cocina",
    status: "accepted",
    created_on: "2026-08-01T10:00:00Z",
    counterpart: {
      id: role === "consumer" ? 1 : 10,
      role: role === "consumer" ? "provider" : "consumer",
      name: role === "consumer" ? "Juan" : "Ana",
      surname: role === "consumer" ? "Gómez" : "Pérez",
      category_name: role === "consumer" ? "Plomería" : undefined,
    },
    ...overrides,
  };
}

export function aWorkOrder(overrides: Partial<MockWorkOrderStub> = {}): MockWorkOrderStub {
  return {
    id: 10,
    service_proposal_id: 42,
    consumer_id: 10,
    provider_id: 1,
    status: "scheduled",
    amount_cents: 1500000,
    scheduled_on: "2026-08-20T10:00:00Z",
    description: "Reparación de cañería en cocina",
    accepted_on: "2026-08-05T10:00:00Z",
    ...overrides,
  };
}

export function aCompletionReport(overrides: Partial<MockCompletionReport> = {}): MockCompletionReport {
  return {
    id: 1,
    description: "Trabajo finalizado correctamente y verificado.",
    reported_on: "2026-08-20T12:00:00Z",
    images: [
      {
        file_id: "file-01",
        original_name: "evidencia_1.jpg",
        url: "https://placehold.co/600x400/png?text=Evidencia+1",
      },
      {
        file_id: "file-02",
        original_name: "evidencia_2.jpg",
        url: "https://placehold.co/600x400/png?text=Evidencia+2",
      },
    ],
    ...overrides,
  };
}

export function aReview(overrides: Partial<MockReview> = {}): MockReview {
  return {
    rating: 5,
    comment: "excelente servicio, muy puntual y prolijo",
    description: "excelente servicio, muy puntual y prolijo",
    ...overrides,
  };
}
